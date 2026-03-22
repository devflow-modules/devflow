# Integração Stripe — WhatsApp Platform

Documentação da integração de cobrança real via Stripe.

## Variáveis de ambiente

**Namespace preferido** (billing isolado por produto):

| Variável | Descrição |
|----------|-----------|
| `WHATSAPP_STRIPE_SECRET_KEY` | Chave secreta Stripe (produção) |
| `WHATSAPP_STRIPE_TEST_SECRET_KEY` | Chave secreta Stripe (teste) |
| `WHATSAPP_STRIPE_WEBHOOK_SECRET` | Secret do webhook (obrigatório) |
| `WHATSAPP_STRIPE_PRICE_PRO` | Price ID do plano PRO |
| `WHATSAPP_STRIPE_PRICE_SCALE` | Price ID do plano SCALE |
| `NEXT_PUBLIC_WHATSAPP_APP_URL` | URL base do app (checkout/portal) |

**Fallback legado** (compatibilidade): `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO`, etc.

## Módulo Stripe

Localização: `src/modules/stripe/`

- **stripeClient.ts** — Cliente Stripe, getPriceId, isStripeConfigured
- **stripeCheckout.ts** — Criação de sessão de checkout com reutilização de customer
- **stripePortal.ts** — Customer Portal (gerenciar assinatura)
- **stripeWebhook.ts** — Validação e parsing de eventos
- **stripeSyncService.ts** — Sincronização Stripe ↔ TenantSubscription + BillingSubscription
- **stripeTypes.ts** — Tipos

## APIs

### POST /api/stripe/checkout

Body: `{ plan: "PRO" | "SCALE" }`

- Usa `stripeCustomerId` existente quando disponível (evita duplicar customers)
- Metadata: `tenantId`, `plan`
- Success: `/billing?success=true`
- Cancel: `/billing?canceled=true`

### POST /api/stripe/portal

Cria sessão do Customer Portal.

- Retorna URL para o usuário gerenciar assinatura (upgrade, downgrade, cancelar)
- Return URL: `/billing`

### POST /api/stripe/webhook

Webhook Stripe. **Não deve ser chamado manualmente.**

Eventos tratados:

- `checkout.session.completed` — Assinatura criada
- `customer.subscription.created` — Nova assinatura
- `customer.subscription.updated` — Alteração (upgrade/downgrade)
- `customer.subscription.deleted` — Cancelamento
- `invoice.payment_succeeded` — Renovação
- `invoice.payment_failed` — Falha → status PAST_DUE
- `invoice.finalized` / `invoice.paid` — Snapshot da última invoice

## Fluxo de upgrade

1. Usuário clica em "Upgrade PRO" ou "Upgrade SCALE"
2. Frontend chama `/api/stripe/checkout` ou `/api/billing/checkout`
3. Backend cria sessão Stripe Checkout e retorna URL
4. Usuário é redirecionado para Stripe
5. Após pagamento, Stripe redireciona para `/billing?success=true`
6. Webhook `checkout.session.completed` atualiza TenantSubscription e BillingSubscription
7. Feature gating e limites passam a refletir o novo plano

## Fluxo de downgrade / cancelamento

1. Usuário acessa Customer Portal (botão "Gerenciar assinatura")
2. No portal Stripe, altera plano ou agenda cancelamento
3. Webhook `customer.subscription.updated` ou `customer.subscription.deleted` atualiza o banco
4. Sistema reflete as mudanças automaticamente

## Segurança

- **Webhook**: assinatura validada com `STRIPE_WEBHOOK_SECRET`; usar raw body
- **Checkout/Portal**: autenticação via cookie; `tenantId` do JWT
- **Tenant isolation**: nunca confiar em dados do frontend; sempre validar user → tenant

## Sincronização

O webhook é a **fonte da verdade**. Ele atualiza:

1. **TenantSubscription** — plan, status, currentPeriodStart/End, stripeCustomerId, stripeSubscriptionId
2. **BillingSubscription** — mesma estrutura para compatibilidade
3. **Tenant** — plan, stripeCustomerId, activeUntil (legado)

## Fallback

Quando Stripe não está configurado:

- Checkout tenta `/api/stripe/checkout` → `/api/billing/checkout` → stub `/api/billing/upgrade`
- Portal tenta `/api/stripe/portal` → `/api/billing/portal`

## Configuração do Webhook no Stripe

1. Dashboard Stripe → Developers → Webhooks
2. Add endpoint: `https://seu-dominio.com/api/stripe/webhook`
3. Eventos: `checkout.session.completed`, `customer.subscription.*`, `invoice.*`
4. Copiar o Signing secret para `WHATSAPP_STRIPE_WEBHOOK_SECRET`

## Testes unitários

Cobertura:

- **stripeSyncService** — syncSubscriptionFromStripe (plan, status, CANCELED, PAST_DUE), markSubscriptionPastDue
- **stripeWebhook** — parseWebhookEvent (checkout, subscription.deleted, invoice.payment_failed)
- **checkout route** — 401 sem auth, 503 sem Stripe, 400 plan inválido, criação de sessão

```bash
pnpm vitest run src/modules/stripe src/app/api/stripe
```

## Testes de integração (manual)

Execute com chave de teste (`STRIPE_TEST_SECRET_KEY`). Use cartões de teste Stripe (ex: `4242 4242 4242 4242`).

Para testar webhook localmente:

```bash
stripe listen --forward-to localhost:3004/api/stripe/webhook
```

O comando exibe um `whsec_...` temporário; use como `STRIPE_WEBHOOK_SECRET` no `.env.local`.
