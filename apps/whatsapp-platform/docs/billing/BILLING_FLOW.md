# Billing — fluxo e fonte de verdade

## Fonte de verdade

| Conceito | Onde vive |
|----------|-----------|
| Planos, limites, capabilities | `modules/billing` — `plans.ts` / capabilities derivadas da subscrição |
| Uso agregado | `UsageAggregate` + eventos (`UsageEventType`) |
| Enforcement antes de ação | `enforceUsageOrThrow` (`enforcementService`) |
| Webhook Stripe | Rota dedicada + idempotência via `BillingAuditLog` / referências Stripe |

## Narrativa comercial vs técnica

- **Limites, quotas e gating** continuam definidos em código (`plans.ts`, enforcement, uso agregado).
- **Copy e comparação de planos na app** usam `planPresentation.ts` e seguem o enquadramento em `PRODUCT_PRICING_NARRATIVE.md`.
- Isto evita que textos de produto copiem literalmente nomes internos ou números sem contexto, sem alterar a fonte de verdade técnica.

## Fluxo resumido

1. **Checkout / Customer** — Stripe Checkout cria subscrição; tenant recebe plano.
2. **Webhook** — eventos `customer.subscription.*`, `invoice.*` atualizam estado interno e audit log.
3. **Uso** — `trackUsage` após ações (mensagem, IA); comparação com limite do plano.
4. **Bloqueio** — com `BILLING_ENFORCE_LIMITS=true` (default), exceder limite lança `UsageLimitExceededError` antes da ação.

## Documentação relacionada

- `docs/billing/PRODUCT_PRICING_NARRATIVE.md` — posicionamento comercial e matriz de valor (UI)
- `docs/billing/CAPABILITIES_MATRIX.md` — alinhamento flags `plans.ts` vs copy e `getUiPlanCapabilities()`
- `docs/ENFORCEMENT_ARCHITECTURE.md` — hard vs soft limit (se presente no repositório)

## Pendências conhecidas (hardening contínuo)

- Garantir que **todos** os caminhos de envio/IA chamam `enforceUsageOrThrow` onde aplicável (matriz em `ENFORCEMENT_ARCHITECTURE.md`).
- Price IDs Stripe: manter apenas variáveis de ambiente por ambiente (test vs live), sem fallback silencioso em produção.
