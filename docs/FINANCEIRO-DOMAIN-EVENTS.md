# Domain Events — Módulo Financeiro

Este documento descreve o sistema de **domain events** do módulo financeiro: eventos emitidos pelos services, event bus, handlers (logging e métricas) e como estender para analytics ou automações futuras.

---

## 1. Lista de eventos do domínio

Os eventos são tipados em `src/modules/financeiro/events/financeEvents.ts`:

| Evento | Emitido por | Descrição |
|--------|-------------|-----------|
| `finance.expense.created` | `createExpense` | Despesa criada |
| `finance.expense.updated` | `updateExpense` | Despesa atualizada |
| `finance.expense.deleted` | `deleteExpense` | Despesa removida |
| `finance.income.created` | `createIncome` | Receita criada |
| `finance.rule.created` | `createRule` | Regra de rateio criada |
| `finance.rule.updated` | `updateRule` | Regra atualizada |
| `finance.household.member_added` | (ex.: ao aceitar convite) | Membro adicionado à casa |
| `finance.household.member_removed` | `removeMember` | Membro removido ou saiu |
| `finance.household.transfer` | `transferOwnership` | Titularidade da casa transferida |
| `finance.invite.sent` | `createInvite` | Convite enviado |
| `finance.goal.updated` | (ex.: upsert de meta) | Meta de alocação atualizada |

---

## 2. Payload esperado

Todos os eventos aceitam um payload com os campos mínimos (recomendados para rastreabilidade):

```ts
{
  householdId?: string;
  userId?: string;
  entityId?: string;
  timestamp?: string;  // preenchido pelo bus se omitido
  [key: string]: unknown;  // campos extras permitidos
}
```

Exemplo ao emitir após criar uma despesa:

```ts
emit("finance.expense.created", {
  householdId,
  userId: auditContext.userId,
  entityId: expense.id,
  timestamp: new Date().toISOString(),
});
```

---

## 3. Como emitir eventos

### No service

1. Importe o bus: `import { emit } from "@/modules/financeiro/events";`
2. Após a operação bem-sucedida (e após audit log, se houver), chame:
   `emit("finance.<entidade>.<ação>", { householdId, userId, entityId, timestamp });`
3. Não altere o retorno do service; a emissão é efeito colateral.

Exemplo:

```ts
// Dentro de createExpense, após createAuditLog:
emit("finance.expense.created", {
  householdId,
  userId: auditContext.userId,
  entityId: expense.id,
  timestamp: new Date().toISOString(),
});
return expense;
```

### Importar o módulo de events

Ao importar `@/modules/financeiro/events`, os **handlers padrão** (logging e métricas) são registrados automaticamente. Não é necessário chamar nenhuma função de inicialização.

---

## 4. Event bus

- **Arquivo:** `src/modules/financeiro/events/financeEventBus.ts`
- **API:**
  - `emit(eventName, payload?)` — dispara o evento e chama todos os handlers inscritos.
  - `subscribe(eventName, handler)` — inscreve um handler para um evento (ou `"*"` para todos).
- Handlers são invocados de forma **síncrona**; erros em um handler são logados e não interrompem os demais.

---

## 5. Handlers padrão

### Logging (`events/handlers/loggingHandler.ts`)

- Inscrito em `"*"` (todos os eventos).
- Encaminha cada evento para `financeLogger.info(eventName, payload)`.
- Logs incluem `module: "finance"`, `event`, e campos do payload (e, se configurado, `traceId`, `requestId`, `serviceName`).

### Métricas (`events/handlers/metricsHandler.ts`)

- Inscrito por evento específico.
- Mapeia evento → contador:
  - `finance.expense.created` → `finance.expenses.created.count`
  - `finance.income.created` → `finance.incomes.created.count`
  - `finance.household.transfer` → `finance.households.transfer.count`
  - `finance.invite.sent` → `finance.invites.sent.count`
  - `finance.household.member_removed` → `finance.households.members.removed.count`
  - entre outros (ver arquivo para a lista completa).
- Usa o adapter `financeMetrics.increment(metricName)`.

---

## 6. Como criar novos handlers

1. Crie um arquivo em `src/modules/financeiro/events/handlers/` (ex.: `myHandler.ts`).
2. Importe `subscribe` de `../financeEventBus` e a lógica desejada (ex.: cliente de analytics).
3. Inscreva-se por evento ou em `"*"`:

```ts
import { subscribe } from "../financeEventBus";

function handle(eventName: string, payload: Record<string, unknown>) {
  // enviar para analytics, fila, etc.
}

export function registerMyHandler(): void {
  subscribe("*", handle);
  // ou: subscribe("finance.expense.created", handle);
}
```

4. Registre o handler na aplicação: em `events/handlers/index.ts`, chame `registerMyHandler()` dentro de `registerDefaultHandlers()` (ou carregue o módulo no bootstrap da app para executar o registro).

---

## 7. Conexão com analytics ou automações futuras

- **Analytics (ex.: Segment, Mixpanel, GA):** criar um handler que, ao receber eventos, chame o SDK do provedor com `eventName` e `payload`.
- **Filas (ex.: SQS, Bull):** handler que publica o evento (ou um DTO derivado) em uma fila para processamento assíncrono.
- **Sentry/Datadog/OpenTelemetry:** o handler de logging já produz logs estruturados; um adapter pode encaminhar `finance.error` ou eventos críticos para o provedor de observabilidade.
- **Métricas externas (Prometheus, Datadog):** o adapter `financeMetrics` hoje mantém contadores em memória e pode ser trocado por uma implementação que exporte para o sistema de métricas (ex.: `increment` → `counter.inc()`).

Nenhuma dependência externa é obrigatória; o bus e os handlers atuais funcionam em modo “local” (console + memória).
