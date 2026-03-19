# Métricas SaaS — WhatsApp Platform

Documentação das métricas de receita e uso do dashboard admin (`/admin/metrics`).

## Definições

### MRR (Monthly Recurring Revenue)

- **Fórmula:** soma do valor mensal dos planos ativos (PRO e SCALE/TEAM).
- **Fonte:** `BillingSubscription` com `status` em `active` ou `trialing`.
- **Preços:** configuráveis por env:
  - `REVENUE_PLAN_PRICE_PRO_BRL` (default 29)
  - `REVENUE_PLAN_PRICE_SCALE_BRL` (default 79)

### ARR (Annual Recurring Revenue)

- **Fórmula:** `ARR = MRR × 12`.

### ARPU (Average Revenue Per User)

- **Fórmula:** `ARPU = MRR / número de assinaturas ativas`.
- **Nota:** denominador são tenants com assinatura ativa, não total de tenants.

### Churn

- **Fórmula:** `Churn = cancelados / (ativos + cancelados) × 100` (percentual).
- **Fonte:** `BillingSubscription` com `status = canceled` vs ativos.
- **Limitação:** hoje é uma visão “all-time” (total de cancelados sobre base atual + cancelados). Churn “no período” (cancelamentos no mês / base no início do mês) exigiria histórico ou campo `canceledAt`.

### Uso (mensagens e IA)

- **Fonte:** `UsageEvent` (e agregados em `UsageAggregate` por período `YYYY-MM`).
- **Tipos:** `MESSAGE_SENT`, `AI_RESPONSE`.
- **Período:** últimos 7 dias, 30 dias ou intervalo customizado (`from`/`to`).

### Top tenants

- Ranking por uso total (mensagens + respostas IA) no período selecionado.
- Dados de tenant: `name`, `plan` (do Prisma).

## APIs

| Endpoint | Descrição |
|----------|-----------|
| `GET /api/admin/metrics/revenue` | MRR, ARR, ARPU, churn, contagens |
| `GET /api/admin/metrics/usage?period=7d\|30d` ou `from=&to=` | Totais e por mês (mensagens, IA) |
| `GET /api/admin/metrics/tenants?period=7d\|30d&limit=10` | Top tenants por uso |

Em produção, todas exigem header `x-admin-metrics-secret` (env `ADMIN_METRICS_SECRET`).

## Limitações

1. **Receita:** não inclui receita variável (metered) já faturada; apenas assinatura fixa por plano.
2. **Churn:** não distingue “cancelados no período”; é razão total cancelados / (ativos + cancelados).
3. **Evolução MRR no tempo:** não há tabela de snapshot; evolução histórica exigiria job diário (ex.: `RevenueSnapshot`) ou cálculo retroativo.
4. **Isolamento:** métricas são globais (admin); por-tenant só na tabela de ranking e nas APIs de billing por tenant.

## Roadmap

- [ ] **RevenueSnapshot:** job diário para MRR/ARR por data e gráfico de evolução.
- [ ] **Churn no período:** usar `updatedAt` em `BillingSubscription` onde `status = canceled` ou campo `canceledAt`.
- [ ] **Cohort / LTV:** retenção por coorte de ativação e LTV estimado.
- [ ] **Receita variável:** incorporar uso faturado (Stripe) na visão de receita.

## Referências

- Billing: [BILLING.md](./BILLING.md), [METERED_BILLING.md](./METERED_BILLING.md)
- Serviços: `apps/whatsapp-platform/src/modules/analytics/` (`revenueService`, `usageAnalyticsService`)
