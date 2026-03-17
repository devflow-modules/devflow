# Product Analytics — Módulo Financeiro

Este documento descreve a camada de **Product Analytics** do módulo financeiro: medição de uso das ferramentas, features e funil de conversão, preparada para integração com PostHog, Amplitude ou Mixpanel.

---

## 1. Visão geral

O adapter `src/modules/financeiro/adapters/productAnalytics/` oferece:

- **trackToolUsage(toolName, context)** — uso de ferramentas (expenses, incomes, rules, cycles, etc.).
- **trackFeatureUsage(featureName, context)** — uso de features (rules.create, household.invite, etc.).
- **trackConversion(eventName, context)** — eventos de conversão / funil.
- **trackFunnelFirst(eventName, context)** — evento de funil apenas na **primeira ocorrência** por household (em memória, por processo).

Contexto mínimo: `{ userId?, householdId, timestamp?, traceId? }`. O `userId` é opcional para serviços que não têm o caller (ex.: createCycle).

---

## 2. Lista de eventos de analytics

### Uso de ferramentas (trackToolUsage)

| toolName         | Métrica incrementada                    |
|-----------------|------------------------------------------|
| `expenses`      | `finance.tool.expenses.usage`           |
| `incomes`       | `finance.tool.incomes.usage`            |
| `rules`         | `finance.tool.rules.usage`              |
| `cycles`        | `finance.tool.cycles.usage`            |
| `payment-days`  | `finance.tool.payment-days.usage`       |
| `allocation-goals` | `finance.tool.allocation-goals.usage` |

Qualquer outro `toolName` gera `finance.tool.<toolName>.usage`.

### Uso de features (trackFeatureUsage)

| featureName             | Métrica incrementada                    |
|-------------------------|------------------------------------------|
| `rules.create`          | `finance.feature.rules.created`         |
| `rules.update`          | `finance.feature.rules.updated`          |
| `household.invite`       | `finance.household.invites.sent`         |
| `household.transfer`     | `finance.household.transfer.usage`      |
| `household.member_removed` | `finance.household.members.removed`   |

Outros geram `finance.feature.<featureName_normalized>.usage`.

### Conversão / funil (trackConversion e trackFunnelFirst)

- **trackConversion(eventName, context)** — incrementa `finance.conversion.<eventName_com_pontos_substituídos_por_underscore>`.
- **trackFunnelFirst(eventName, context)** — só na primeira vez (por household + evento, em memória) chama trackConversion.

Eventos de funil definidos:

| Evento                                      | Onde é emitido                    |
|---------------------------------------------|------------------------------------|
| `finance.funnel.household.created`          | createHousehold (sempre, primeira vez em memória) |
| `finance.funnel.first_expense_created`      | createExpense (primeira vez em memória) |
| `finance.funnel.first_income_created`       | createIncome (primeira vez em memória) |
| `finance.funnel.first_rule_created`         | createRule (primeira vez em memória) |
| `finance.funnel.first_cycle_configured`     | createCycle (primeira vez em memória) |

**Limitação:** “Primeira ocorrência” é em memória por processo; após restart do servidor o mesmo household pode gerar o evento de funil de novo. Para “primeira vez ever” seria necessário checagem em banco (ex.: contar despesas do household e emitir só se count === 1).

---

## 3. Definição das métricas

Todas as métricas de produto usam **contadores** via `financeMetrics.increment(metricName)`:

- **finance.tool.\*** — uso de ferramentas.
- **finance.feature.\*** — uso de features (criação/edição de regras, convites, transferência, remoção de membro).
- **finance.household.\*** — ações em household (invites, transfer, members.removed).
- **finance.conversion.\*** — passos de funil / conversão.

Em desenvolvimento, o adapter também loga via `financeLogger.info` (product_analytics.tool_usage, product_analytics.feature_usage, product_analytics.conversion).

---

## 4. Exemplos de uso

### No service

```ts
import { trackToolUsage, trackFeatureUsage, trackFunnelFirst } from "@/modules/financeiro/adapters/productAnalytics";

// Após criar despesa
const analyticsContext = { userId: auditContext.userId, householdId };
trackToolUsage("expenses", analyticsContext);
trackFunnelFirst("finance.funnel.first_expense_created", analyticsContext);

// Após criar regra
trackFeatureUsage("rules.create", { userId: auditContext.userId, householdId });
trackFunnelFirst("finance.funnel.first_rule_created", { userId: auditContext.userId, householdId });

// Após transferir titularidade
trackFeatureUsage("household.transfer", { userId: context.userId, householdId });
```

### Sem userId (ex.: createCycle)

```ts
trackToolUsage("cycles", { householdId });
trackFunnelFirst("finance.funnel.first_cycle_configured", { householdId });
```

---

## 5. Como instrumentar novas features

1. **Ferramenta nova (ex.: “budgets”)**  
   - Adicionar em `TOOL_METRIC` em `financeProductAnalytics.ts`: `budgets: "finance.tool.budgets.usage"`.  
   - No service que representa o uso da ferramenta: `trackToolUsage("budgets", context)`.

2. **Feature nova (ex.: “rules.delete”)**  
   - Adicionar em `FEATURE_METRIC` se quiser nome específico; caso contrário o padrão `finance.feature.<name>.usage` será usado.  
   - No service: `trackFeatureUsage("rules.delete", context)`.

3. **Novo passo de funil**  
   - Incluir o nome em `FunnelEventName` (opcional, para tipo).  
   - Onde for a “primeira vez” (ou onde fizer sentido): `trackFunnelFirst("finance.funnel.<novo_passo>", context)`.

Não alterar retorno dos services; analytics é efeito colateral.

---

## 6. Integração com ferramentas externas

O adapter hoje:

- Escreve em **financeMetrics** (contadores em memória).
- Opcionalmente loga com **financeLogger** em desenvolvimento.

Para integrar com **PostHog, Amplitude, Mixpanel**:

1. Criar um módulo (ex.: `productAnalyticsPostHog.ts`) que receba os mesmos eventos (tool, feature, conversion).
2. Dentro de `trackToolUsage`, `trackFeatureUsage` e `trackConversion` (ou em um único “dispatch”), chamar o cliente do provedor com o evento e o payload (userId, householdId, timestamp, traceId, etc.).
3. Manter a chamada a `increment()` para as métricas internas; o envio ao provedor pode ser assíncrono (fire-and-forget ou fila).

Exemplo de payload para provedor externo:

```ts
{
  distinctId: context.userId ?? context.householdId,
  event: "finance_tool_usage",
  properties: {
    toolName,
    householdId: context.householdId,
    timestamp: context.timestamp,
    traceId: context.traceId,
  },
}
```

---

## 7. Testes

Os testes em `__tests__/analytics/productAnalytics.test.ts` cobrem:

- trackToolUsage incrementa a métrica correta (expenses, incomes, tool não mapeado).
- trackFeatureUsage incrementa rules.create, household.invite, household.transfer.
- trackConversion incrementa finance.conversion.*.
- trackFunnelFirst retorna true na primeira vez e incrementa; retorna false na segunda para o mesmo household+evento; emite de novo para household diferente.

`resetMetrics()` e `resetFunnelState()` são usados entre testes para isolar estado.
