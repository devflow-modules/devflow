# Testes do módulo financeiro

Estrutura preparada para testes unitários (Vitest) e futura cobertura.

## Organização

- `services/dashboard/` — testes de getDashboardSummary, getCashFlowProjection
- `services/expenses/` — listExpenses, createExpense, updateExpense, deleteExpense
- `services/incomes/` — listIncomes, createIncome, updateIncome, deleteIncome
- `services/rules/` — listRules, createRule, updateRule, deleteRule, getRuleAllocations
- `services/sources/` — listSources, createSource, updateSource, deleteSource
- `services/cycles/` — listCycles, createCycle, updateCycle, deleteCycle
- `services/invites/` — listInvites, createInvite, revokeInvite, acceptInvite
- `services/households/` — createHousehold, listMembers, removeMember, transferOwnership, setActiveHousehold
- `services/allocation-goals/` — metas de alocação (income e personal)
- `services/leads/` — createLead

## Prioridade de cobertura

1. Dashboard e expenses/incomes (já extraídos e estáveis)
2. Rules e sources
3. Invites e households
4. Allocation goals e leads

## Como rodar (após instalar Vitest)

```bash
pnpm add -D vitest
# Em package.json: "test": "vitest"
pnpm test
```

Use mock do Prisma (`prisma.*` mock) para isolar lógica de negócio dos services.
