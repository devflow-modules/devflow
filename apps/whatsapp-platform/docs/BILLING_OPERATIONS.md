# Billing — Camada Operacional

Observabilidade, auditoria e rastreabilidade do billing em produção.

---

## 1. BillingAuditLog

Tabela para auditoria de eventos críticos:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | String | Cuid |
| tenantId | String | Tenant |
| eventType | String | Tipo do evento |
| source | String | "stripe" \| "usage" \| "system" |
| referenceId | String? | event.id, invoice.id, etc |
| metadata | JSON | Contexto adicional |
| createdAt | DateTime | Timestamp |

**Idempotência:** `(referenceId, eventType)` único quando referenceId não é null.

---

## 2. Eventos registrados

| Fonte | Eventos |
|-------|---------|
| **stripe** | checkout.session.completed, customer.subscription.*, invoice.* |
| **usage** | usage.registered, usage.overage_sent, usage.limit_exceeded, usage.threshold_warning |
| **system** | system.error (webhook, reportUsage, trackUsage) |

---

## 3. BillingObserverService

```ts
import {
  logStripeEvent,
  logUsageEvent,
  logLimitExceeded,
  logOverageSent,
  logSystemError,
  logInvoicePaymentFailed,
  logUsageThresholdWarning,
} from "@/modules/billing";
```

| Função | Uso |
|--------|-----|
| logStripeEvent | Webhook route |
| logUsageEvent | Após trackUsage |
| logLimitExceeded | Quando enforcement bloqueia |
| logOverageSent | Quando report*Usage envia overage ao Stripe |
| logSystemError | Erros em webhook, reportUsage, trackUsage |
| logInvoicePaymentFailed | invoice.payment_failed (crítico) |
| logUsageThresholdWarning | usage >= 80% do limite |

---

## 4. Logs padronizados

```
[STRIPE] event=<type> tenant=<id> ref=<event.id>
[USAGE] tenant=<id> feature=<feature> qty=<n>
[USAGE][BLOCKED] tenant=<id> feature=<feature>
[BILLING][WARN] tenant=<id> feature=<feature> used=<n> limit=<n> (80%)
[BILLING][CRITICAL] invoice.payment_failed tenant=<id> invoice=<id>
[BILLING][ERROR] context=<context> tenant=<id>
```

---

## 5. Como auditar qualquer cobrança

1. **BillingAuditLog** — Filtrar por `tenantId`, `source`, `eventType`
2. **referenceId** — Buscar por `event.id` (Stripe) ou `invoice.id`
3. **metadata** — Detalhes como `errorMessage`, `stack`, `overage`, etc

Exemplo de query:
```sql
SELECT * FROM billing_audit_logs
WHERE tenant_id = 'xxx'
  AND source = 'stripe'
  AND event_type LIKE 'invoice.%'
ORDER BY created_at DESC;
```

---

## 6. Como rastrear bugs financeiros

1. **system.error** — Erros em webhook, reportUsage, trackUsage
2. **metadata** — `context`, `errorMessage`, `stack`
3. **Correlação** — `referenceId` liga ao Stripe (event.id, invoice.id)
4. **Sequência** — `created_at` ordena a linha do tempo

---

## 7. Suporte ao cliente

- **Histórico de uso** — usage.registered, usage.overage_sent
- **Bloqueios** — usage.limit_exceeded
- **Eventos Stripe** — checkout, subscription, invoice
- **Falhas de pagamento** — invoice.payment_failed

---

## 8. Evolução para Sentry / Datadog

1. **Sentry** — Em `logSystemError`, chamar `Sentry.captureException(err, { extra: { tenantId, context } })`
2. **Datadog** — Em `logUsageEvent`, enviar métrica `billing.usage` com tags `tenant`, `feature`
3. **Alertas** — `usage.threshold_warning` e `invoice.payment_failed` como gatilhos
4. **Dashboard** — Agregar BillingAuditLog por `eventType`, `source`, `tenantId`

---

## 9. getTenantBillingSummary

```ts
const summary = await getTenantBillingSummary(tenantId);
// summary.plan, summary.status
// summary.usage.messages, summary.usage.ai
// summary.limits.messages, summary.limits.ai
// summary.overage.messages, summary.overage.ai
// summary.lastInvoice, summary.nextInvoice
```

Usar em dashboard interno ou API admin.
