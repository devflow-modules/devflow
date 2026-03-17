# Dashboard interno de métricas — DevFlow

Este documento descreve o **dashboard interno de métricas** do produto e do funil de growth, acessível em `/admin/metrics`.

---

## 1. Descrição

O dashboard exibe as métricas registradas em memória pelas camadas de **Product Analytics** (módulo financeiro) e **Growth Analytics** (funil DevFlow). É de uso **interno (admin/dev)** e não altera o comportamento do produto.

- **URL:** `/admin/metrics`
- **Fonte dos dados:** `financeMetrics.getCounters()` e `growthMetrics.getCounters()` (contadores em memória por processo).
- **Atualização:** botão "Atualizar" e refresh automático a cada 15 segundos.

---

## 2. Métricas exibidas

### Seção 1 — Finance Metrics

- **Expenses created** — `finance.tool.expenses.usage`
- **Incomes created** — `finance.tool.incomes.usage`
- **Rules created** — `finance.feature.rules.created`
- **Rules updated** — `finance.feature.rules.updated`
- **Invites sent** — `finance.household.invites.sent`
- **Expenses (domain)** — `finance.expenses.created.count` (domain events)
- **Incomes (domain)** — `finance.incomes.created.count` (domain events)

### Seção 2 — Growth Funnel

- **Visitors** — `devflow.visitors.count`
- **Simulator usage** — `devflow.simulator.usage`
- **Leads submitted** — `devflow.leads.submitted`
- **Signup started** — `devflow.signup.started`
- **Signup completed** — `devflow.signup.completed`
- **Households created** — `devflow.households.created`

### Seção 3 — Funil visual

Lista em sequência com contagem de cada etapa:

Visitors → Simulator used → Leads → Signup started → Signup completed → Households created → First expense → First income → First rule

### Seção 4 — Activation

- **First expense** — `devflow.activation.expense`
- **First income** — `devflow.activation.income`
- **First rule** — `devflow.activation.rule`

### Seção 5 — Conversões

- **Visitor → Lead** — `(leads / visitors) * 100` (%). Exibido como "—" se não houver visitantes.
- **Lead → Signup** — `(signupCompleted / leads) * 100` (%). Exibido como "—" se não houver leads.
- **Activation (expense / households)** — `(firstExpense / households) * 100` (%). Exibido como "—" se não houver casas criadas.

---

## 3. Cálculo de conversões

| Conversão | Fórmula | Descrição |
|-----------|--------|-----------|
| Visitor → Lead | `leads / visitors * 100` | % de visitantes que enviaram e-mail no lead. |
| Lead → Signup | `signupCompleted / leads * 100` | % de leads que concluíram cadastro. |
| Activation rate | `firstExpense / households * 100` | % de casas que criaram ao menos uma despesa. |

Todas em porcentagem; quando o denominador é 0, é exibido "—".

---

## 4. API interna

- **GET /api/admin/metrics**
  - **Resposta:** `{ finance: { metrics: Record<string, number> }, growth: { metrics: Record<string, number> } }`
  - **Proteção:** em `development` não exige header; em produção exige header `x-admin-metrics-secret` igual a `process.env.ADMIN_METRICS_SECRET`. Se o secret não for enviado (e não estiver em dev), retorna 403.

---

## 5. Componentes

- **`src/components/admin/metrics/MetricsCard.tsx`** — Card com label e valor (número ou string).
- **`src/components/admin/metrics/MetricsSection.tsx`** — Seção com título e grid de cards.
- **`src/components/admin/metrics/FunnelVisualization.tsx`** — Lista vertical de etapas do funil com contagem e seta (↓) entre etapas.

---

## 6. Como adicionar novas métricas

1. **Registrar a métrica** na camada que já incrementa (product analytics ou growth analytics), garantindo que o nome do contador seja usado em `increment(metricName)`.
2. **Exibir no dashboard:** em `MetricsDashboardClient.tsx`, usar `get(data.finance.metrics, "nome.da.metrica")` ou `get(data.growth.metrics, "nome.da.metrica")` e adicionar um `<MetricsCard>` na seção correspondente (Finance Metrics, Growth Funnel ou Activation).
3. **Conversão nova:** calcular no client (ex.: `const x = a / b * 100`) e exibir em um `MetricsCard` na seção "Conversões".

Não é necessário alterar a API: ela já retorna todos os contadores de `getCounters()` de cada camada.
