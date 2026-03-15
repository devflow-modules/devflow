# Relatório — Sprint 10: Payment Integration (Checkout + Webhooks)

## Objetivo

Integrar gateway de pagamento real (Stripe) para upgrade de plano, mantendo arquitetura substituível (Lemon, Paddle, Mercado Pago) e sem alterar o comportamento atual do billing.

## Entregas

### FASE 1 — Adapter de pagamento

- **`src/modules/billing/adapters/payment/types.ts`** — Tipos comuns: `CreateCheckoutParams`, `CreateCheckoutResult`, `WebhookParsedEvent`, `PaymentAdapter`.
- **`src/modules/billing/adapters/payment/StripeAdapter.ts`** — Implementação Stripe:
  - `createCheckoutSession(userId, email, planId, successUrl, cancelUrl)` → `{ checkoutUrl, sessionId }`
  - `validateWebhook(signature, payload)` → evento Stripe (lança se assinatura inválida)
  - `parseWebhookEvent(event)` → `{ type, userId?, planId?, subscriptionId? }` para eventos relevantes
- **`src/modules/billing/adapters/payment/index.ts`** — Barrel export do adapter.

### FASE 2 — Endpoint de checkout

- **`POST /api/billing/checkout`** (`src/app/api/billing/checkout/route.ts`):
  - Body: `{ planId: "PRO" | "TEAM" }`
  - Autenticação: `requireSessionOnly`
  - Chama `StripeAdapter.createCheckoutSession` com success/cancel URLs
  - Emite `billing.checkout_started`
  - Resposta: `{ data: { checkoutUrl } }` ou 503 se Stripe não configurado

### FASE 3 — Webhook de pagamento

- **`POST /api/billing/webhook`** (`src/app/api/billing/webhook/route.ts`):
  - Lê body com `request.text()` (raw para validação)
  - Valida assinatura com `validateWebhook(signature, payload)`
  - `parseWebhookEvent(event)` e trata:
    - `checkout.session.completed` → `setUserPlan(userId, planId)` + `trackPaymentCompleted`
    - `customer.subscription.updated` → atualiza plano
    - `customer.subscription.deleted` → `setUserPlan(userId, "FREE")` + `trackSubscriptionCancelled`
  - Retorna 200 OK para eventos tratados; 400 para assinatura inválida; 500 em erro interno

### FASE 4 — Persistência de plano

- **Prisma:** modelo `UserPlan` (`userId` unique, `planId`, `createdAt`, `updatedAt`), relação opcional em `User`.
- **Migration:** `20260315053903_add_user_plans` (criada com `prisma migrate dev --name add_user_plans --create-only`).
- **`src/modules/billing/BillingRepository.ts`** — `getUserPlan(userId)`, `setUserPlan(userId, planId)` usando Prisma.
- **`BillingService`** — Refatorado para async; usa `BillingRepository` em todas as operações de plano. Rotas que usam `checkLimit`/`checkFeature` passaram a usar `await`.

### FASE 5 — Upgrade page

- **`src/app/upgrade/UpgradeCta.tsx`** — Botão "Upgrade para PRO" (ou plano via prop):
  - `POST /api/billing/checkout` com `{ planId }`
  - Redireciona para `checkoutUrl` em sucesso
  - Estado de loading e tratamento de erro (alert)
- Texto da página atualizado para "Redirecionando ao checkout seguro".

### FASE 6 — Pricing page

- **`src/app/pricing/PricingPlanCta.tsx`** — CTA por plano: FREE → link "Começar grátis"; PRO/TEAM → botão que chama checkout e redireciona.
- **`src/app/pricing/page.tsx`** — Usa `PricingPlanCta`; texto final atualizado para "Pagamento seguro via Stripe".

### FASE 7 — Eventos de billing

- **`src/modules/billing/billingAnalytics.ts`** — Novas funções:
  - `trackCheckoutStarted({ userId?, planId? })`
  - `trackPaymentCompleted({ userId?, planId? })`
  - `trackSubscriptionCancelled({ userId? })`
- Integração com growth metrics (`devflow.billing.*`); checkout e webhook emitem os eventos acima.

### FASE 8 — Testes

- **`src/modules/billing/__tests__/BillingRepository.test.ts`** — Mock do Prisma; `getUserPlan` (FREE/default, planId existente, planId inválido), `setUserPlan` (upsert).
- **`src/modules/billing/adapters/payment/__tests__/StripeAdapter.test.ts`** — Mock do SDK Stripe:
  - `parseWebhookEvent`: checkout.session.completed, invoice.payment_succeeded, subscription.updated/deleted, evento desconhecido
  - `createCheckoutSession`: retorno de checkoutUrl/sessionId, uso de STRIPE_PRICE_PRO/TEAM
  - `validateWebhook`: evento válido e assinatura inválida
- **`src/app/api/billing/webhook/__tests__/route.test.ts`** — Mock de adapter e BillingService: 400 sem signature, 400 assinatura inválida, 200 + setUserPlan em checkout.session.completed e subscription.deleted, 200 sem chamar setUserPlan quando parse retorna null.
- **Ajustes em testes existentes:** `BillingService` e `featureGuard` passaram a async; testes passam a mockar `BillingRepository` e usar `await`.

### FASE 9 — Variáveis de ambiente

- **`.env.example`** — Incluídas:
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - `STRIPE_PRICE_PRO`
  - `STRIPE_PRICE_TEAM`

### FASE 10 — Documentação

- **`docs/DEVFLOW-PAYMENTS.md`** — Arquitetura de pagamentos, fluxo de checkout, fluxo de webhook, persistência, env vars, como adicionar planos e como trocar de gateway.

## Dependência

- **stripe** (^17.0.0) adicionada em `package.json`.

## Critérios de qualidade

| Critério | Status |
|----------|--------|
| Checkout funcionando (rota + redirect) | ✅ |
| Webhook funcionando (validação + eventos) | ✅ |
| Plano atualizado após pagamento (UserPlan + BillingService) | ✅ |
| BillingService usando repository | ✅ |
| Upgrade page integrada ao checkout | ✅ |
| Pricing page com CTA real | ✅ |
| Eventos de billing registrados | ✅ |
| Testes passando | ✅ (104 testes) |
| Build funcionando | ✅ |

## Observações

- **Migração:** A migration `add_user_plans` foi criada com `--create-only`. Para aplicar: `pnpm db:migrate` (ou `prisma migrate dev`).
- **Stripe:** Sem as env configuradas, a rota de checkout retorna 503 `BILLING_NOT_CONFIGURED`; o restante do app continua funcionando (planos FREE por padrão).
- **Substituição de gateway:** Basta implementar um novo adapter com a mesma interface lógica e trocar as chamadas nas rotas (ou usar factory por env).
