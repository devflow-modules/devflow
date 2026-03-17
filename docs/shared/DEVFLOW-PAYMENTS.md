# DevFlow — Integração de Pagamentos (Stripe)

Documentação da arquitetura de pagamentos, fluxo de checkout, webhooks e como trocar de gateway.

## Visão geral

- **Gateway atual:** Stripe (Checkout Session + Webhooks).
- **Persistência:** tabela `UserPlan` (Prisma); `BillingService` usa `BillingRepository`.
- **Planos:** FREE (padrão), PRO, TEAM; limites e features em `src/modules/billing/plans.ts`.

A integração fica isolada no módulo `billing`; o resto do sistema depende apenas de `BillingService.getUserPlan` / `checkLimit` / `checkFeature`.

---

## Arquitetura

```
Frontend (Upgrade / Pricing)
    → POST /api/billing/checkout { planId }
    ← { data: { checkoutUrl } }
    → redirect to Stripe Checkout

Stripe
    → POST /api/billing/webhook (eventos)
    → validar assinatura → parseWebhookEvent → BillingService.setUserPlan
```

### Camadas

| Camada | Responsabilidade |
|--------|------------------|
| **Rotas** | `POST /api/billing/checkout`, `POST /api/billing/webhook` — auth, body, resposta. |
| **StripeAdapter** | `createCheckoutSession`, `validateWebhook`, `parseWebhookEvent` — Stripe SDK. |
| **BillingService** | `getUserPlan`, `setUserPlan`, `checkLimit`, `checkFeature` — regras de plano. |
| **BillingRepository** | `getUserPlan`, `setUserPlan` — leitura/escrita na tabela `UserPlan`. |

---

## Fluxo de checkout

1. Usuário autenticado clica em "Upgrade" (página `/upgrade` ou `/pricing`).
2. Frontend chama `POST /api/billing/checkout` com `{ planId: "PRO" }` ou `"TEAM"`.
3. Backend:
   - Valida sessão (`requireSessionOnly`).
   - Chama `StripeAdapter.createCheckoutSession(userId, email, planId, successUrl, cancelUrl)`.
   - Emite `billing.checkout_started` (growth analytics).
   - Retorna `{ data: { checkoutUrl } }`.
4. Frontend redireciona para `checkoutUrl` (Stripe Hosted Checkout).
5. Após pagamento, Stripe redireciona para `successUrl` (ex.: `/upgrade?success=1`) e envia o evento `checkout.session.completed` para o webhook.

---

## Fluxo de webhook

1. Stripe envia `POST /api/billing/webhook` com header `stripe-signature` e body bruto (JSON).
2. Backend:
   - Lê `request.text()` (corpo bruto para validação).
   - `StripeAdapter.validateWebhook(signature, payload)` → lança se assinatura inválida.
   - `StripeAdapter.parseWebhookEvent(event)` → extrai `type`, `userId`, `planId` (quando aplicável).
3. Eventos tratados:
   - **checkout.session.completed** → `BillingService.setUserPlan(userId, planId)` + `trackPaymentCompleted`.
   - **customer.subscription.updated** → atualiza plano se `userId`/`planId` em metadata.
   - **customer.subscription.deleted** → `setUserPlan(userId, "FREE")` + `trackSubscriptionCancelled`.
4. Resposta sempre `200 OK` para eventos reconhecidos (evita retentativas desnecessárias); erros internos retornam 500.

**Importante:** O webhook deve receber o body **raw** (não parseado como JSON antes da validação). Next.js App Router: usar `request.text()` e repassar esse valor para `validateWebhook`.

---

## Variáveis de ambiente

| Variável | Uso |
|----------|-----|
| `STRIPE_SECRET_KEY` | Chave secreta da API Stripe (checkout + constructEvent). |
| `STRIPE_WEBHOOK_SECRET` | Secret do endpoint de webhook no Stripe Dashboard (validação da assinatura). |
| `STRIPE_PRICE_PRO` | Price ID do plano PRO (subscription). |
| `STRIPE_PRICE_TEAM` | Price ID do plano TEAM (subscription). |

Sem essas variáveis, `createCheckoutSession` e `validateWebhook` falham; a rota de checkout retorna 503 com código `BILLING_NOT_CONFIGURED`.

---

## Persistência de plano

- **Tabela:** `UserPlan` (`userId` unique, `planId`, `createdAt`, `updatedAt`).
- **BillingRepository:** `getUserPlan(userId)` (default `FREE` se não houver registro), `setUserPlan(userId, planId)` (upsert).
- **BillingService** usa o repository para todas as leituras/escritas de plano; limites e features vêm de `plans.ts`.

Migration: `prisma migrate dev` (já existe migration para `UserPlan`).

---

## Como adicionar novos planos

1. **Planos:** Em `src/modules/billing/plans.ts`, adicionar novo `PlanId` e entrada em `Plans` (limites e features).
2. **Stripe:** Criar Product/Price no Stripe; adicionar env `STRIPE_PRICE_<NOME>`.
3. **Checkout:** Incluir o novo `planId` no schema de `POST /api/billing/checkout` (ex.: `z.enum(["PRO", "TEAM", "ENTERPRISE"])`).
4. **Adapter:** Em `StripeAdapter`, em `getPriceId`, mapear o novo plano para a env correspondente.
5. **Frontend:** Incluir o plano na página de pricing e no CTA de upgrade (já usa `planId` dinâmico quando disponível).

---

## Como trocar de gateway (Lemon, Paddle, Mercado Pago)

1. **Manter contrato:** As rotas continuam recebendo `planId` e devolvendo `checkoutUrl`; o webhook continua recebendo um payload e atualizando plano via `BillingService.setUserPlan`.
2. **Novo adapter:** Criar em `src/modules/billing/adapters/payment/` (ex.: `LemonAdapter.ts`) implementando a mesma interface lógica:
   - `createCheckoutSession(params) → { checkoutUrl }`
   - `validateWebhook(signature, payload) → event`
   - `parseWebhookEvent(event) → { type, userId?, planId? }`
3. **Rotas:** Trocar as chamadas de `StripeAdapter` pelo novo adapter (por exemplo via env `BILLING_ADAPTER=stripe|lemon` e um factory).
4. **Variáveis:** Documentar e usar as env específicas do novo gateway (chaves, secrets, price IDs).
5. **BillingService e BillingRepository:** Não precisam mudar; apenas a origem dos eventos (webhook) e a criação da sessão de checkout mudam.

---

## Eventos de billing (growth analytics)

- `billing.checkout_started` — ao criar sessão de checkout.
- `billing.payment_completed` — após `checkout.session.completed` ou `customer.subscription.updated` com plano pago.
- `billing.subscription_cancelled` — em `customer.subscription.deleted`.

Registrados em `billingAnalytics.ts` e integrados ao pipeline de growth (métricas em memória; preparado para envio a ferramenta externa).

---

## Testes

- **StripeAdapter:** mock do SDK Stripe; testes para `createCheckoutSession`, `validateWebhook`, `parseWebhookEvent`.
- **BillingRepository:** mock do Prisma; testes para `getUserPlan` e `setUserPlan`.
- **Webhook:** mock de adapter e `BillingService`; testes para assinatura inválida, `checkout.session.completed`, `customer.subscription.deleted`, e evento ignorado (parse retorna null).

Execução: `pnpm test` (inclui testes do módulo billing e da rota de webhook).
