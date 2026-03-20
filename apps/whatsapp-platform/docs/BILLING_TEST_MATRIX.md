# Matriz de teste do Billing — Webhook Stripe

Validação operacional completa do webhook e da sincronização de billing.

> Ver também: `BILLING_ARCHITECTURE.md` — arquitetura e fluxos.

---

## 1. Sequência de validação recomendada

Execute nesta ordem:

| # | Evento | Comando |
|---|--------|---------|
| 1 | `checkout.session.completed` | `stripe trigger checkout.session.completed` |
| 2 | `customer.subscription.updated` | `stripe trigger customer.subscription.updated` |
| 3 | `invoice.payment_succeeded` | `stripe trigger invoice.payment_succeeded` |
| 4 | Replay do #1 | Reenviar mesmo evento no Dashboard |

---

## 2. Matriz de teste

| Evento | Ação | Esperado no Stripe | Esperado no log | Esperado no banco |
|--------|------|--------------------|-----------------|-------------------|
| **checkout.session.completed** | Checkout finalizado | `200 OK` | `[STRIPE] checkout.session.completed id: evt_xxx` | `Tenant.plan` atualizado, `activeUntil` definido; `TenantSubscription` + `BillingSubscription` criados/atualizados |
| **customer.subscription.created** | Assinatura criada | `200 OK` | `[STRIPE] customer.subscription.created id: evt_xxx` | Igual ao checkout (plan, activeUntil, sync) |
| **customer.subscription.updated** | Assinatura alterada (upgrade/downgrade) | `200 OK` | `[STRIPE] customer.subscription.updated id: evt_xxx` | `Tenant.plan`, `activeUntil`, `TenantSubscription`, `BillingSubscription` sincronizados |
| **customer.subscription.deleted** | Assinatura cancelada | `200 OK` | `[STRIPE] customer.subscription.deleted id: evt_xxx` | `Tenant.plan` = free, `activeUntil` = null; `BillingSubscription` status = canceled |
| **invoice.payment_succeeded** | Pagamento de fatura OK | `200 OK` | `[STRIPE] invoice.payment_succeeded id: evt_xxx` | `BillingSubscription.lastInvoiceId`, `lastInvoiceAmountPaid`; `Tenant.activeUntil`; sync subscription |
| **invoice.payment_failed** | Pagamento falhou | `200 OK` | `[STRIPE] invoice.payment_failed id: evt_xxx` | `TenantSubscription.status` = PAST_DUE; `BillingSubscription.status` = past_due |
| **invoice.finalized** / **invoice.paid** | Fatura finalizada/paga | `200 OK` | `[STRIPE] invoice.finalized id: evt_xxx` | `BillingSubscription.lastInvoiceId`, `lastInvoiceStatus`, `lastInvoiceAmountPaid` |
| **invoice.upcoming** | Cobrança próxima | `200 OK` | `[STRIPE] invoice.upcoming id: evt_xxx` | Nenhum (apenas log; TODO: notificação) |
| **Replay (idempotência)** | Reenviar mesmo `event.id` | `200 OK` | `[STRIPE] <evento> id: evt_xxx` (1x) | Sem reprocessamento; retorno imediato 200 |

---

## 3. Interpretação de erros

| HTTP | Significado | Próximo passo |
|------|-------------|---------------|
| **200** | Webhook OK (assinatura, handler, resposta) | Validar banco e logs |
| **400** | Assinatura inválida | Verificar `WHATSAPP_STRIPE_WEBHOOK_SECRET` (test vs live, endpoint correto) |
| **500** | Erro interno no handler | Logs: `[STRIPE] <evento> erro: ...`; checar DB, Stripe API, sync |

---

## 4. Comandos de trigger (Stripe CLI)

```bash
# Núcleo billing
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
stripe trigger invoice.payment_succeeded

# Extras
stripe trigger customer.subscription.deleted
stripe trigger invoice.payment_failed
stripe trigger invoice.upcoming
```

---

## 5. Checklist de validação

- [ ] Stripe Dashboard → Entregas de eventos → todos com `200 OK`
- [ ] Logs do servidor com `[STRIPE] <evento> id: evt_xxx`
- [ ] `Tenant.plan` e `activeUntil` corretos após checkout/updated
- [ ] `TenantSubscription` e `BillingSubscription` sincronizados
- [ ] Replay do mesmo evento → 200 sem reprocessar (idempotência)
- [ ] `invoice.payment_failed` → status PAST_DUE no banco
- [ ] `customer.subscription.deleted` → plan=free, status=canceled

---

## 6. Próximos testes (futuro)

| Item | Descrição |
|------|-----------|
| **Meter events** | Validar uso (mensagens, IA) e reconciliação com Stripe Billing |
| **Invoice overage** | Faturas com itens de uso (usage-based) |
| **Checkout real** | Fluxo completo: página → checkout → webhook → banco |
| **invoice.upcoming** | Implementar notificação (email/in-app) |
