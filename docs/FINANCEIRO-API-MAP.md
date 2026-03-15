# Mapa de APIs — Módulo Financeiro DevFlow

**Captura de estado:** março 2025

---

## Health e sessão

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/health` | Health check (sem auth) |
| GET | `/api/me` | Usuário logado + households |
| GET | `/api/me/active-household` | Household ativa do usuário |
| PATCH | `/api/me/active-household` | Define household ativa (body: `householdId`) |

---

## Households

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/households` | Lista households do usuário |
| POST | `/api/households` | Cria nova household |
| GET | `/api/households/[householdId]/members` | Lista membros da casa |
| DELETE | `/api/households/[householdId]/members/[membershipId]` | Remove membro (OWNER) |
| POST | `/api/households/[householdId]/transfer-ownership` | Transfere titularidade (OWNER) |

---

## Invites

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/invites` | Lista convites pendentes da household (OWNER) |
| POST | `/api/invites` | Cria convite (OWNER) — body: `email`, `role` |
| DELETE | `/api/invites/[inviteId]` | Revoga convite (OWNER) |
| POST | `/api/invites/accept` | Aceita convite — body: `token` |

---

## Sources

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/sources` | Lista fontes da household |
| POST | `/api/sources` | Cria fonte — body: `name`, `sourceType`, `description?`, `isActive?` |
| PATCH | `/api/sources/[sourceId]` | Atualiza fonte |
| DELETE | `/api/sources/[sourceId]` | Exclui fonte |

---

## Cycles

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/cycles` | Lista ciclos da household |
| POST | `/api/cycles` | Cria ciclo — body: `name`, `cycleType`, `anchorDay?`, `anchorWeekDay?` |
| PATCH | `/api/cycles/[cycleId]` | Atualiza ciclo |
| DELETE | `/api/cycles/[cycleId]` | Exclui ciclo |

---

## Payment Days

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/payment-days` | Adiciona dia de recebimento — body: `sourceId`, `dayOfMonth`, `cycleId?` |
| DELETE | `/api/payment-days/[paymentDayId]` | Remove dia de recebimento |

---

## Incomes

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/incomes` | Lista receitas da household |
| POST | `/api/incomes` | Cria receita — body: `amount`, `receivedAt`, `sourceId?`, `isRecurring?`, `status?` |
| PATCH | `/api/incomes/[incomeId]` | Atualiza receita |
| DELETE | `/api/incomes/[incomeId]` | Exclui receita |

---

## Expenses

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/expenses` | Lista despesas da household |
| POST | `/api/expenses` | Cria despesa — body: `category`, `amount`, `dueDate`, `sourceId?`, `isRecurring?` |
| PATCH | `/api/expenses/[expenseId]` | Atualiza despesa (inclui `status`, `paidAt`, `paidAmount`) |
| DELETE | `/api/expenses/[expenseId]` | Exclui despesa |

---

## Rules

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/rules` | Lista regras da household |
| POST | `/api/rules` | Cria regra — body: `name`, `ruleType`, `percentage?`, `fixedAmount?`, `referenceCategory?`, `sourceIds?` |
| PATCH | `/api/rules/[ruleId]` | Atualiza regra |
| DELETE | `/api/rules/[ruleId]` | Exclui regra |
| GET | `/api/rules/allocations` | Histórico de rateios calculados |

---

## Metas de alocação

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/income-allocation-goals?year=&month=` | Meta da família (OWNER) |
| POST | `/api/income-allocation-goals` | Cria/atualiza meta da família — body: `year`, `month`, `investmentPercent?`, `savingsPercent?`, `investmentAmount?`, `savingsAmount?`, `observations?` |
| PATCH | `/api/income-allocation-goals/[goalId]` | Atualiza meta |
| DELETE | `/api/income-allocation-goals/[goalId]` | Exclui meta |
| GET | `/api/personal-allocation-goals?year=&month=` | Meta pessoal do usuário |
| POST | `/api/personal-allocation-goals` | Cria/atualiza meta pessoal |
| PATCH | `/api/personal-allocation-goals/[goalId]` | Atualiza meta pessoal |
| DELETE | `/api/personal-allocation-goals/[goalId]` | Exclui meta pessoal |

---

## Dashboard

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/dashboard/summary?months=6` | Série mensal (receitas, despesas, saldo) |
| GET | `/api/dashboard/cash-flow-projection?horizonMonths=&scenario=` | Projeção de fluxo — `scenario`: BASE, PESSIMISTIC, OPTIMISTIC |

---

## Padrão de resposta

```ts
// Sucesso
{ success: true, data: T }

// Erro
{ success: false, error: { message: string, code?: string } }
```

---

## Autenticação

Todas as rotas (exceto `/api/health` e `/api/invites/accept` com token) exigem sessão Supabase válida. Sem sessão → 401.
