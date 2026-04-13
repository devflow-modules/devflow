# Billing — fluxo e fonte de verdade

## Fonte de verdade

| Conceito | Onde vive |
|----------|-----------|
| Planos, limites, capabilities | `modules/billing` — `plans.ts` / capabilities derivadas da subscrição |
| Uso agregado | `UsageAggregate` + eventos (`UsageEventType`) |
| Enforcement antes de ação | `enforceUsageOrThrow` (`enforcementService`) |
| Webhook Stripe | Rota dedicada + idempotência via `BillingAuditLog` / referências Stripe (ver `BILLING_OPERATIONS.md`) |

## Fluxo resumido

1. **Checkout / Customer** — Stripe Checkout cria subscrição; tenant recebe plano.
2. **Webhook** — eventos `customer.subscription.*`, `invoice.*` atualizam estado interno e audit log.
3. **Uso** — `trackUsage` após ações (mensagem, IA); comparação com limite do plano.
4. **Bloqueio** — com `BILLING_ENFORCE_LIMITS=true` (default), exceder limite lança `UsageLimitExceededError` antes da ação.

## Documentação relacionada

- `docs/BILLING_OPERATIONS.md` — auditoria, logs, observabilidade
- `docs/ENFORCEMENT_ARCHITECTURE.md` — hard vs soft limit
- `docs/BILLING_ARCHITECTURE.md` — visão técnica (se presente no repo)

## Pendências conhecidas (hardening contínuo)

- Garantir que **todos** os caminhos de envio/IA chamam `enforceUsageOrThrow` onde aplicável (matriz em `ENFORCEMENT_ARCHITECTURE.md`).
- Price IDs Stripe: manter apenas variáveis de ambiente por ambiente (test vs live), sem fallback silencioso em produção.
