# Arquitetura do Billing — WhatsApp Platform

Documentação da implementação production-ready do sistema de billing com Stripe.

---

## 1. Camadas

```
route.ts (webhook)     → validação, idempotência, roteamento
       ↓
billingWebhookService  → lógica de negócio por evento
       ↓
stripeSyncService      → sync TenantSubscription + BillingSubscription
billingRepository      → acesso ao banco (upsert, ensureWebhookIdempotency)
```

### Route (`/api/stripe/webhook`)

- Valida assinatura com `constructEvent`
- Garante idempotência (`ensureWebhookIdempotency`)
- Delega para `handleStripeWebhookEvent`
- Retorna 200/400/500 conforme especificação
- Logs padronizados: `[STRIPE] event=<type> id=<id> tenant=<id>`

### billingWebhookService

- Handlers por evento: `handleCheckoutCompleted`, `handleSubscriptionUpdated`, etc.
- Resolução de `tenantId` via metadata ou `stripeCustomerId`
- Orquestra `syncSubscriptionFromStripe`, `markSubscriptionPastDue`, Prisma

### stripeSyncService

- `syncSubscriptionFromStripe`: atualiza TenantSubscription e BillingSubscription
- `markSubscriptionPastDue`: status PAST_DUE em ambos
- Mapeia status Stripe → local (active, past_due, canceled)
- Reset de quotas quando período muda

---

## 2. Eventos → Ações

| Evento | Ação |
|--------|------|
| **checkout.session.completed** | Vincula customerId ao tenant, atualiza plan, activeUntil, sync subscription |
| **customer.subscription.created** | Cria BillingSubscription, define plan, status, currentPeriodEnd |
| **customer.subscription.updated** | Atualiza plan, status, currentPeriodEnd |
| **customer.subscription.deleted** | plan = free, status = canceled, limpa BillingSubscription |
| **invoice.payment_succeeded** | lastInvoiceId, lastInvoiceAmountPaid, **status = active** |
| **invoice.payment_failed** | **status = past_due** em TenantSubscription e BillingSubscription |
| **invoice.finalized** / **invoice.paid** | lastInvoiceId, lastInvoiceStatus, lastInvoiceAmountPaid |
| **invoice.upcoming** | Log (TODO: notificação) |

---

## 3. Idempotência

- Tabela `StripeWebhookEvent` com `stripeEventId` único
- `ensureWebhookIdempotency(event.id, event.type)` tenta insert
- Se já existe → retorna `false` → route retorna 200 sem processar
- Retry do Stripe não reprocessa evento

---

## 4. Segurança

- `validateWebhook(signature, payload)` → `stripe.webhooks.constructEvent`
- Secret: `WHATSAPP_STRIPE_WEBHOOK_SECRET` (prod) ou `WHATSAPP_STRIPE_TEST_WEBHOOK_SECRET` (dev)
- Sem validação → 400 "Webhook Error"
- Raw body obrigatório (`request.text()`)

---

## 5. Inconsistência

Para evitar inconsistência:

1. **Idempotência** — event.id nunca processado mais de uma vez
2. **Transações** — `syncSubscriptionFromStripe` usa `prisma.$transaction` para TenantSubscription + lógica sequencial
3. **Fonte da verdade** — Stripe é a fonte; webhook aplica mudanças no banco
4. **Resolução de tenant** — múltiplas fontes (Tenant, TenantSubscription, BillingSubscription) para cobrir eventos sem metadata

---

## 6. Conexão com Meter Events

- **BillingSubscription** armazena `stripeSubscriptionItemMsgId` e `stripeSubscriptionItemAiId`
- `reportMessageUsage` / `reportAiUsage` enviam usage ao Stripe via API
- Stripe gera faturas com itens de uso (overage)
- `invoice.payment_succeeded` atualiza lastInvoice no banco
- Quotas (`messagesIncludedUsed`, `aiIncludedUsed`) são resetadas no `upsertBillingSubscription` quando o período muda

---

## 7. Feature Gating

- `getTenantPlanCapabilities(plan)` → `{ maxMessages, maxAIUsage, featuresEnabled }`
- `canUseFeature(tenantId, feature)` / `assertFeature(tenantId, feature)` usam `getTenantPlan`
- `getTenantPlan` prioriza: TenantSubscription > BillingSubscription > Tenant.plan > FREE

---

## 8. Multi-tenant Enterprise

Para escalar para enterprise:

1. **Planos custom** — metadata `plan: "ENTERPRISE"` + lookup em tabela de contratos
2. **Múltiplos produtos** — event handler por `product.id` ou `price.id`
3. **Webhook por produto** — ou um endpoint com roteamento interno
4. **Quotas por tenant** — já suportado via BillingSubscription
5. **SSO / orgs** — resolver tenantId por orgId em metadata do checkout
