# Billing por uso — WhatsApp Platform

## Arquitetura

| Camada | Função |
|--------|--------|
| **UsageEvent** | Cada evento atômico: `MESSAGE_SENT` ou `AI_RESPONSE` (tenant isolado). |
| **UsageAggregate** | Totais por mês (`YYYY-MM`) para leitura rápida; atualizado na mesma transação do evento. |
| **BillingSubscription** | Espelho da assinatura Stripe (plano, status, período, IDs). |
| **Tenant** | Continua com `plan`, `stripeCustomerId`, `activeUntil` (fonte operacional). |

**Estratégia Stripe (MVP):**

- Plano base: subscription existente via `@devflow/billing-core` (PRO = `PRICE_PRO`, SCALE = price TEAM / `PRICE_TEAM`).
- **Uso variável**: registrado **localmente** (`UsageEvent`). Cobrança variável pode ser faturada manualmente, relatório, ou futuramente **Stripe metered billing** / invoice items.

## Fluxo de uso

| Evento | Onde | Tipo |
|--------|------|------|
| Envio humano (inbox) | `POST .../inbox/conversations/:id/send` após sucesso | `MESSAGE_SENT` |
| Envio via `sendReplyAndPersist` / webhook legado / IA (path Supabase) | `sendMessageService` | `MESSAGE_SENT` |
| Envio IA sem Supabase | `sendWebhookAutoReply` branch direto | `MESSAGE_SENT` |
| Resposta IA automática bem-sucedida | `aiAutomationService` após log | `AI_RESPONSE` |

**Sem duplicar inbox**: inbox não passa por `sendReplyAndPersist`; tracking só na rota de send.

## Preços de referência (estimativa UI)

Env (opcional):

- `BILLING_PRICE_MESSAGE_BRL` — default `0.05`
- `BILLING_PRICE_AI_BRL` — default `0.10`

Usados apenas para **custo estimado** em `/api/billing/usage` e na UI; não disparam cobrança automática.

## Limites por plano

| Plano (normalizado) | Mensagens/mês | IA/mês |
|---------------------|---------------|--------|
| FREE / starter      | 500           | 50     |
| PRO                 | 10.000        | 2.000  |
| SCALE / TEAM        | ilimitado     | ilimitado |

**Enforcement:** `BILLING_ENFORCE_LIMITS=true` → bloqueia envio na inbox (402) e IA automática quando ultrapassar limites. Default **desligado** (só métricas).

## API

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/billing/usage?period=YYYY-MM` | Uso + limites + custo estimado. |
| GET | `/api/billing/subscription` | Plano, status, período Stripe. |
| POST | `/api/billing/checkout` | Body `{ "plan": "PRO" \| "SCALE" }` → URL Stripe Checkout. |
| POST | `/api/billing/portal` | URL Customer Portal. |

### Exemplo JSON — uso

```json
{
  "success": true,
  "data": {
    "period": "2025-03",
    "messagesSent": 120,
    "aiResponses": 15,
    "limits": { "messagesPerMonth": 500, "aiResponsesPerMonth": 50 },
    "unitPricesBrl": { "message": 0.05, "aiResponse": 0.1 },
    "estimatedVariableCostBrl": 7.5,
    "withinLimits": { "messages": true, "ai": true }
  }
}
```

## Webhook Stripe

`POST /api/stripe/webhook`:

- `checkout.session.completed` — atualiza tenant + `BillingSubscription`.
- `customer.subscription.updated` — período, plano, sync.
- `customer.subscription.deleted` — downgrade starter + limpa sub.
- `invoice.payment_succeeded` — `activeUntil` + sync (tenant resolvido por **customer id** se necessário).
- `invoice.payment_failed` — `BillingSubscription.status = past_due` por `stripeCustomerId`.

Plano Stripe `TEAM` é mapeado para **`scale`** no tenant.

## Migração

1. `pnpm exec prisma migrate deploy` (migration `20260318140000_billing_usage`).
2. Sem backfill de histórico: contagem começa após deploy.
3. Validar webhook Stripe apontando para a URL de produção.

## Health

`GET /api/inbox/health` inclui `billingUsage` (período atual, contagens, último evento).

## Cobrança variável automática

Com **prices metered** e env `STRIPE_METERED_PRICE_MESSAGES` / `STRIPE_METERED_PRICE_AI`, cada `UsageEvent` dispara usage record no Stripe. Ver **[METERED_BILLING.md](./METERED_BILLING.md)**.

## Próximos passos

- Alertas de uso / dashboards admin.
- Alertas ao aproximar do limite.
- Dashboard admin multi-tenant.

## Checklist

- [x] Models + migration
- [x] Tracking mensagem + IA
- [x] Serviços billing / usage / sync Stripe
- [x] Webhook estendido
- [x] API billing
- [x] UI `/settings/billing`
- [x] Testes
- [x] Documentação
