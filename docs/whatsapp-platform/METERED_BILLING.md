# Cobrança variável automática (Stripe Metered)

## Arquitetura

1. **Plano base** — subscription existente (PRO / SCALE via `billing-core`).
2. **Dois prices metered** — anexados à mesma subscription como *subscription items* adicionais:
   - mensagens outbound (`MESSAGE_SENT`)
   - respostas IA (`AI_RESPONSE`)
3. Cada `UsageEvent` dispara um **usage record** no Stripe com **idempotency key** `wplat-usage-{usageEventId}` (sem duplicar cobrança em retry).
4. **Faturamento** — Stripe agrega uso no fim do período e emite **invoice** (valores conforme unit amount dos prices metered).

## Configuração no Stripe (Dashboard)

1. Criar **Product** (ex.: WhatsApp Platform — uso).
2. Criar **Price** recurring, **metered**, `usage_type: metered`, `unit_amount` em centavos (ex.: 5 = R$0,05 se moeda BRL).
3. Repetir para IA (ex.: 10 centavos).
4. Copiar **Price IDs** para o ambiente:

| Variável | Descrição |
|----------|-----------|
| `STRIPE_METERED_PRICE_MESSAGES` | Price ID mensagens (prod) |
| `STRIPE_METERED_PRICE_AI` | Price ID IA (prod) |
| `STRIPE_TEST_METERED_PRICE_MESSAGES` | Dev / test |
| `STRIPE_TEST_METERED_PRICE_AI` | Dev / test |

Sem essas variáveis, o app **não** envia uso ao Stripe (só registra localmente).

## Fluxo

1. Webhook `checkout.session.completed` / `customer.subscription.updated` → `syncBillingSubscriptionFromStripe` → **`ensureMeteredItemsOnSubscription`**: cria itens metered na subscription se ainda não existirem; persiste `stripeSubscriptionItemMsgId` / `stripeSubscriptionItemAiId` em `BillingSubscription`.
2. `trackUsage` → após gravar `UsageEvent` → **`queueReportUsageToStripe`** (async).
3. Falha → incrementa `stripeReportAttempts`, log em `stripeReportLastError`, **retry com backoff** no processo; além disso **cron** pode chamar `POST /api/cron/retry-stripe-metered` com `Authorization: Bearer {CRON_SECRET}`.

## Webhooks Stripe

Além dos já existentes, atualizamos snapshot em:

- `invoice.finalized`, `invoice.paid`, `invoice.payment_succeeded` → `lastInvoiceId`, `lastInvoiceStatus`, `lastInvoiceAmountPaid` na `BillingSubscription` do tenant (via `stripeSubscriptionId` na invoice).

## API

| Rota | Descrição |
|------|-----------|
| `GET /api/billing/usage/stripe` | Uso local vs reportado ao Stripe no período. |
| `POST /api/cron/retry-stripe-metered` | Reprocessa eventos pendentes (cron). |

## UI

`/settings/billing` mostra, quando metered configurado:

- **Uso faturado (Stripe)** vs totais locais (via `stripeMetered` em `/api/billing/usage`).
- Última invoice (status / valor pago) vinda da subscription.

## Troubleshooting

| Problema | Ação |
|----------|------|
| Uso não aparece na invoice | Conferir se itens metered foram criados (webhook pós-checkout); ver `BillingSubscription.stripeSubscriptionItem*`. |
| Erro “no_active_subscription” | Tenant FREE/starter sem sub paga não reporta (esperado). |
| Duplicidade | Idempotency por `usageEventId`; não apagar eventos. |
| Serverless mata retry in-process | Configurar cron em `retry-stripe-metered`. |

## Checklist

- [ ] Prices metered criados no Stripe
- [ ] Env com price IDs
- [ ] Webhook Stripe apontando para a app
- [ ] Assinatura ativa (checkout) para anexar itens metered
- [ ] CRON opcional para retries
