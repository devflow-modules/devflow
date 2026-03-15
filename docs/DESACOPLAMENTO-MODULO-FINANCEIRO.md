# Desacoplamento do Módulo Financeiro — Relatório

**Data:** 2026-03-15  
**Objetivo:** Isolar o domínio financeiro em `src/modules/financeiro` sem alterar rotas, schema do banco, comportamento visual ou contratos públicos.

---

## 1. Resumo do que foi feito

### Fase 1 — Estrutura e movimentação

- **Criada** a pasta `src/modules/financeiro` com:
  - `components/` — componentes React do financeiro
  - `hooks/` — (vazio; `useHousehold` está em `lib/household`)
  - `services/` — serviços por caso de uso (dashboard, expenses, incomes)
  - `lib/` — db, supabase, schema (re-exports), api-response, primitives, cn, utils, auth, household, marketing, cashFlowProjection
  - `types/` — (vazio; tipos nos schemas e services)
  - `schemas/` — validações Zod do domínio
  - `constants/` — constantes do módulo

- **Movido para o módulo** (código fonte em `src/modules/financeiro`):
  - Tudo que estava em `src/lib/financeiro/` → `modules/financeiro/lib/` (e `schemas/`)
  - Tudo que estava em `src/components/financeiro/` → `modules/financeiro/components/`
  - `src/lib/dashboard/cashFlowProjection.ts` → `modules/financeiro/lib/cashFlowProjection.ts`

- **Mantidos como re-exports** (para não quebrar imports existentes):
  - `src/lib/financeiro/*` — re-exportam de `@/modules/financeiro/...`
  - `src/components/financeiro/*` — re-exportam de `@/modules/financeiro/components/...`
  - `src/lib/dashboard/cashFlowProjection.ts` — re-exporta de `@/modules/financeiro/lib/cashFlowProjection`

- **Imports atualizados** onde era necessário:
  - `src/app/api/dashboard/cash-flow-projection/route.ts` — usa `@/modules/financeiro/schemas` e `@/modules/financeiro/lib/cashFlowProjection`

### Fase 2 — Services e orquestração

- **Criados services:**
  - **Dashboard:** `getDashboardSummary`, `getCashFlowProjection`
  - **Expenses:** `listExpenses`, `createExpense`, `updateExpense`, `deleteExpense`
  - **Incomes:** `listIncomes`, `createIncome`, `updateIncome`, `deleteIncome`

- **Route handlers** passaram a:
  - Validar auth e input (schemas)
  - Chamar o service correspondente
  - Devolver `sendSuccess` / `sendError`

- **Rotas, schema do banco, comportamento e contratos** foram mantidos iguais.

---

## 2. Árvore final de pastas do módulo

```
src/modules/financeiro/
├── components/
│   ├── AppShell.tsx
│   ├── Breadcrumbs.tsx
│   ├── CashFlowProjectionChart.tsx
│   ├── DespesasFixasTool.tsx
│   ├── DividirContasTool.tsx
│   ├── FinanceiroTools.tsx
│   ├── LeadCaptureForm.tsx
│   ├── MonthlyTrendChart.tsx
│   ├── ProjecaoFinanceiraTool.tsx
│   ├── Sidebar.tsx
│   ├── SimuladorRapidoFinanceiro.tsx
│   └── Skeleton.tsx
├── constants/
│   └── index.ts
├── hooks/                 # (vazio; useHousehold em lib/household)
├── lib/
│   ├── api-response.ts
│   ├── cn.ts
│   ├── db.ts
│   ├── primitives.ts
│   ├── cashFlowProjection.ts
│   ├── auth/
│   │   └── activeHousehold.ts
│   ├── household/
│   │   └── HouseholdProvider.tsx
│   ├── marketing/
│   │   └── service.ts
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── middleware-client.ts
│   └── utils/
│       ├── index.ts
│       └── response.ts
├── schemas/
│   └── index.ts
├── services/
│   ├── dashboard/
│   │   ├── getDashboardSummary.ts
│   │   └── getCashFlowProjection.ts
│   ├── expenses/
│   │   ├── index.ts
│   │   ├── listExpenses.ts
│   │   ├── createExpense.ts
│   │   ├── updateExpense.ts
│   │   └── deleteExpense.ts
│   └── incomes/
│       ├── index.ts
│       ├── listIncomes.ts
│       ├── createIncome.ts
│       ├── updateIncome.ts
│       └── deleteIncome.ts
└── types/                 # (vazio)
```

---

## 3. Arquivos alterados (lista)

### Novos

- `src/modules/financeiro/**` — todo o conteúdo do módulo (componentes, lib, schemas, services, constants).

### Alterados (re-exports ou uso de services)

- `src/lib/financeiro/db.ts` — re-export
- `src/lib/financeiro/api-response.ts` — re-export
- `src/lib/financeiro/schema.ts` — re-export
- `src/lib/financeiro/cn.ts` — re-export
- `src/lib/financeiro/primitives.ts` — re-export
- `src/lib/financeiro/utils/response.ts` — re-export
- `src/lib/financeiro/utils/index.ts` — re-export
- `src/lib/financeiro/supabase/client.ts` — re-export
- `src/lib/financeiro/supabase/server.ts` — re-export
- `src/lib/financeiro/supabase/middleware-client.ts` — re-export
- `src/lib/financeiro/marketing/service.ts` — re-export
- `src/lib/financeiro/auth/activeHousehold.ts` — re-export
- `src/lib/financeiro/household/HouseholdProvider.tsx` — re-export
- `src/lib/dashboard/cashFlowProjection.ts` — re-export
- `src/components/financeiro/*.tsx` — re-exports (12 arquivos)
- `src/app/api/dashboard/summary/route.ts` — usa `getDashboardSummary`
- `src/app/api/dashboard/cash-flow-projection/route.ts` — usa `getCashFlowProjection` + imports do módulo
- `src/app/api/expenses/route.ts` — usa `listExpenses`, `createExpense`
- `src/app/api/expenses/[expenseId]/route.ts` — usa `updateExpense`, `deleteExpense`
- `src/app/api/incomes/route.ts` — usa `listIncomes`, `createIncome`
- `src/app/api/incomes/[incomeId]/route.ts` — usa `updateIncome`, `deleteIncome`

### Inalterados (comportamento e contratos)

- Rotas em `app/` (paths iguais).
- Schema Prisma e migrations.
- Páginas em `app/ferramentas/financeiro/*` (continuam importando de `@/components/financeiro` e `@/lib/financeiro` via re-exports).
- Middleware e demais APIs que usam `@/lib/financeiro` ou `@/app/api/_helpers/auth`.

---

## 4. Possíveis próximos passos

1. **Migrar imports** — Trocar gradualmente `@/lib/financeiro/*` e `@/components/financeiro/*` por `@/modules/financeiro/*` nas páginas e em outros pontos do app; depois remover os re-exports em `lib/financeiro` e `components/financeiro` se desejar.

2. **Mover helpers de API** — Avaliar mover `app/api/_helpers/auth.ts` e `household.ts` para o módulo (ex.: `modules/financeiro/lib/auth/requireHouseholdMembership`) e atualizar as rotas que os usam.

3. **Services para outras entidades** — Aplicar o mesmo padrão (service + rota enxuta) para households, sources, rules, cycles, payment-days, invites, allocation-goals.

4. **Testes** — Adicionar testes unitários para os services em `modules/financeiro/services/**` (Vitest) e, se fizer sentido, testes E2E para fluxos críticos (Playwright).

5. **Barrel exports** — Criar `modules/financeiro/index.ts` (e sub-barrels) para importações mais curtas, por exemplo `@/modules/financeiro` ou `@/modules/financeiro/services`.

6. **Tipos explícitos** — Extrair tipos de retorno e parâmetros dos services para `modules/financeiro/types/` e reutilizar em rotas e front.

---

## 5. Build e restrições

- **Build:** `pnpm run build` concluído com sucesso.
- **Restrições respeitadas:** rotas inalteradas; schema do banco inalterado; comportamento visual e contratos públicos mantidos.
