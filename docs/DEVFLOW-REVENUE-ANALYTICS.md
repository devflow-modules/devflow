# Revenue Analytics — DevFlow

Documentação da camada de métricas financeiras do DevFlow, implementada na Sprint 11.

---

## 1. Visão Geral

O módulo `src/modules/revenue` centraliza o cálculo de todas as métricas de receita do produto. Ele é independente da camada de billing e consome duas fontes de dados:

| Fonte | O que fornece |
|---|---|
| Tabela `UserPlan` (Prisma) | Planos ativos de cada usuário |
| `growthMetrics` (in-memory) | Eventos de billing (pagamentos, cancelamentos, visualizações) |

---

## 2. Métricas Implementadas

### MRR — Monthly Recurring Revenue

```
MRR = Σ (usuários_por_plano × preço_mensal_do_plano)
```

Preços definidos em `revenuePlans.ts`:

| Plano | Preço/mês (BRL) |
|-------|----------------|
| FREE  | R$ 0            |
| PRO   | R$ 29           |
| TEAM  | R$ 79           |

Retorna:

```typescript
{
  totalMRR: number  // soma total
  proMRR: number    // contribuição PRO
  teamMRR: number   // contribuição TEAM
}
```

### ARR — Annual Recurring Revenue

```
ARR = MRR × 12
```

### ARPU — Average Revenue Per User

```
ARPU = MRR total / total de usuários ativos
```

Inclui usuários FREE no denominador (reflete receita média por usuário da base total).

### Churn Rate

```
churn = cancelamentos / (assinantes_pagos + cancelamentos) × 100
```

Usa o contador `devflow.billing.subscription_cancelled` como numerador e o total de pagantes (PRO + TEAM) como base histórica.

### Upgrade Rate

```
upgradeRate = pagamentos_completados / visualizações_de_plano × 100
```

Mede quantos usuários que visualizaram a página de planos efetivamente converteram para pago.

---

## 3. Fontes de Dados

### Tabela `UserPlan`

```sql
SELECT planId FROM "UserPlan";
```

- Consultada via `prisma.userPlan.findMany`
- Fonte de verdade para planos ativos
- Atualizada pelo webhook Stripe ao receber `checkout.session.completed` ou `customer.subscription.deleted`

### Eventos em memória (`growthMetrics`)

Contadores utilizados:

| Contador | Evento de origem |
|---|---|
| `devflow.billing.plan_viewed` | Página de pricing visualizada |
| `devflow.billing.upgrade_clicked` | Botão de upgrade clicado |
| `devflow.billing.checkout_started` | Sessão Stripe criada |
| `devflow.billing.payment_completed` | Webhook `checkout.session.completed` |
| `devflow.billing.subscription_cancelled` | Webhook `customer.subscription.deleted` |

> Os contadores são reiniciados a cada reinicialização do servidor. Para persistência histórica, integrar com PostHog, Amplitude ou banco de dados.

---

## 4. Estrutura do Módulo

```
src/modules/revenue/
├── revenueTypes.ts          # Interfaces: RevenueMetrics, PlanDistribution, etc.
├── revenuePlans.ts          # Preços por plano (PLAN_PRICE)
├── RevenueService.ts        # Funções de cálculo
├── index.ts                 # Barrel export
└── __tests__/
    └── RevenueService.test.ts
```

---

## 5. API

### `GET /api/admin/revenue`

Protegida pelo header `x-admin-metrics-secret` (exceto em development).

Resposta:

```json
{
  "mrr": 108,
  "arr": 1296,
  "proMRR": 29,
  "teamMRR": 79,
  "arpu": 36,
  "churnRate": 0,
  "upgradeRate": 6,
  "planDistribution": {
    "freeUsers": 1,
    "proUsers": 1,
    "teamUsers": 1,
    "totalUsers": 3,
    "totalPaid": 2
  }
}
```

---

## 6. Dashboard

A página `/admin/metrics` exibe:

- Cards: MRR, ARR, ARPU, Churn rate, Upgrade rate, MRR PRO, MRR TEAM
- Gráfico de barras horizontais: distribuição FREE / PRO / TEAM (componente `PlanDistributionChart`)
- Cards de contagem: usuários por plano e total pagantes

---

## 7. Adicionar novo plano

1. Definir o plano em `src/modules/billing/plans.ts`
2. Adicionar preço em `src/modules/revenue/revenuePlans.ts`
3. Atualizar `calculateMRR` e `getPlanDistribution` em `RevenueService.ts`
4. Atualizar `PlanDistributionChart` para incluir nova barra
5. Criar Price ID no Stripe e atualizar variáveis de ambiente

---

## 8. Referências

- [DEVFLOW-PAYMENTS.md](./DEVFLOW-PAYMENTS.md) — Integração com Stripe
- [DEVFLOW-BILLING.md](./DEVFLOW-BILLING.md) — Camada de monetização
- `src/modules/billing/BillingRepository.ts` — Persistência de planos
- `src/analytics/growth/growthMetrics.ts` — Eventos em memória
