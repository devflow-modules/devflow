# Sprint 2 — Desacoplamento do Módulo Financeiro

**Data:** 2026-03-11  
**Objetivo:** Avançar o desacoplamento com migração de imports, extração de services, centralização de types/schemas e base para testes, sem alterar rotas, contratos ou schema do banco.

---

## 1. Resumo do que foi feito

### FASE 1 — Migrar imports para o módulo direto

- **Alcance:** Todos os arquivos que importavam de `@/lib/financeiro` ou `@/components/financeiro` foram atualizados para usar diretamente:
  - `@/modules/financeiro/lib/*`
  - `@/modules/financeiro/schemas`
  - `@/modules/financeiro/components/*`
- **Arquivos alterados:** Rotas em `src/app/api/*`, páginas em `src/app/ferramentas/financeiro/*`, `src/app/ferramentas/divisao-de-contas/page.tsx`, `src/app/api/_helpers/auth.ts`, `src/app/api/_helpers/sameOrigin.ts`, `src/app/api/health/route.ts`, `src/middleware.ts`.
- **Imports legados removidos:** Nenhum consumidor direto restante; todo o código da aplicação passa a usar apenas `@/modules/financeiro/*`.
- **Re-exports mantidos:** Os arquivos em `src/lib/financeiro/*` e `src/components/financeiro/*` continuam existindo apenas como re-exports para compatibilidade (ex.: `export { prisma } from "@/modules/financeiro/lib/db"`).

### FASE 2 — Extrair services do restante do domínio

Lógica de negócio extraída das rotas para `src/modules/financeiro/services/`:

| Domínio | Services criados |
|--------|-------------------|
| **rules** | `listRules`, `createRule`, `updateRule`, `deleteRule`, `getRuleAllocations` |
| **sources** | `listSources`, `createSource`, `updateSource`, `deleteSource` |
| **cycles** | `listCycles`, `getCycle`, `createCycle`, `updateCycle`, `deleteCycle` |
| **payment-days** | `listPaymentDays`, `createPaymentDay`, `updatePaymentDay`, `deletePaymentDay` |
| **invites** | `listInvites`, `createInvite`, `revokeInvite`, `acceptInvite` |
| **households** | `createHousehold`, `listMembers`, `removeMember`, `transferOwnership`, `setActiveHousehold` |
| **allocation-goals** | `getIncomeAllocationGoal`, `upsertIncomeAllocationGoal`, `updateIncomeAllocationGoal`, `deleteIncomeAllocationGoal`, `getPersonalAllocationGoal`, `upsertPersonalAllocationGoal`, `updatePersonalAllocationGoal`, `deletePersonalAllocationGoal` |
| **leads** | `createLead` |

**Handlers/rotas refatorados:** Todas as rotas de API do domínio financeiro passaram a apenas validar auth, validar input (Zod), chamar o service correspondente e retornar `sendSuccess`/`sendError`. Cookies (ex.: active-household, accept invite, create household, remove member) continuam sendo setados nas rotas após o retorno do service.

### FASE 3 — Centralizar contracts, types e schemas

- **Criados:**
  - `src/modules/financeiro/types/contracts.ts` — `AuthHouseholdContext`, `AuthSessionContext`, `ListParams`, re-export de `ApiSuccessPayload` e `ApiErrorPayload`.
  - `src/modules/financeiro/types/domain.ts` — `MembershipRole`, `SourceType`, `ExpenseStatus`, `IncomeStatus`, `RuleType`, `CycleType`, `MemberItem`, `AllocationItem`, `RuleAllocationResponse`.
  - `src/modules/financeiro/types/index.ts` — barrel dos tipos.
- **Schemas:** Já centralizados em `src/modules/financeiro/schemas/index.ts` (sem alteração de contrato).

### FASE 4 — Preparar base de testes do módulo

- **Criados:**
  - `src/modules/financeiro/__tests__/README.md` — organização por domínio/service e prioridade de cobertura.
  - `src/modules/financeiro/__tests__/services/dashboard/getDashboardSummary.example.test.ts` — exemplo de teste (comentado) para quando Vitest for adicionado ao projeto.
- O projeto ainda não possui Vitest; a estrutura está pronta para adicionar testes aos services.

---

## 2. Lista dos services criados (Sprint 2)

- **rules:** listRules, createRule, updateRule, deleteRule, getRuleAllocations  
- **sources:** listSources, createSource, updateSource, deleteSource  
- **cycles:** listCycles, getCycle, createCycle, updateCycle, deleteCycle  
- **payment-days:** listPaymentDays, createPaymentDay, updatePaymentDay, deletePaymentDay  
- **invites:** listInvites, createInvite, revokeInvite, acceptInvite  
- **households:** createHousehold, listMembers, removeMember, transferOwnership, setActiveHousehold  
- **allocation-goals:** getIncomeAllocationGoal, upsertIncomeAllocationGoal, updateIncomeAllocationGoal, deleteIncomeAllocationGoal, getPersonalAllocationGoal, upsertPersonalAllocationGoal, updatePersonalAllocationGoal, deletePersonalAllocationGoal  
- **leads:** createLead  

*(Dashboard, expenses e incomes já existiam da Sprint 1.)*

---

## 3. Lista dos handlers/rotas refatorados

- `src/app/api/rules/route.ts` (GET, POST)  
- `src/app/api/rules/[ruleId]/route.ts` (PATCH, DELETE)  
- `src/app/api/rules/allocations/route.ts` (GET)  
- `src/app/api/sources/route.ts` (GET, POST)  
- `src/app/api/sources/[sourceId]/route.ts` (PATCH, DELETE)  
- `src/app/api/cycles/route.ts` (GET, POST)  
- `src/app/api/cycles/[cycleId]/route.ts` (GET, PATCH, DELETE)  
- `src/app/api/payment-days/route.ts` (GET, POST)  
- `src/app/api/payment-days/[paymentDayId]/route.ts` (PATCH, DELETE)  
- `src/app/api/invites/route.ts` (GET, POST)  
- `src/app/api/invites/[inviteId]/route.ts` (DELETE)  
- `src/app/api/invites/accept/route.ts` (POST)  
- `src/app/api/households/route.ts` (POST)  
- `src/app/api/households/[householdId]/members/route.ts` (GET)  
- `src/app/api/households/[householdId]/members/[membershipId]/route.ts` (DELETE)  
- `src/app/api/households/[householdId]/transfer-ownership/route.ts` (POST)  
- `src/app/api/me/active-household/route.ts` (POST)  
- `src/app/api/income-allocation-goals/route.ts` (GET, POST)  
- `src/app/api/income-allocation-goals/[goalId]/route.ts` (PATCH, DELETE)  
- `src/app/api/personal-allocation-goals/route.ts` (GET, POST)  
- `src/app/api/personal-allocation-goals/[goalId]/route.ts` (PATCH, DELETE)  
- `src/app/api/financeiro/leads/route.ts` (POST)  

---

## 4. Imports antigos removidos

Todos os imports que apontavam para `@/lib/financeiro/*` ou `@/components/financeiro/*` foram substituídos por imports diretos para `@/modules/financeiro/*` (lib, schemas, components). Nenhum arquivo da aplicação passa mais a importar dos caminhos legados.

---

## 5. Imports legados que ainda sobraram

**Nenhum consumidor direto.** Os únicos arquivos que ainda referenciam o caminho do módulo como “origem” são os **re-exports** em:

- `src/lib/financeiro/*` (cada arquivo re-exporta de `@/modules/financeiro/...`)
- `src/components/financeiro/*` (idem)

Eles foram mantidos de propósito para compatibilidade (ex.: código externo ou bookmarks que ainda usem `@/lib/financeiro` ou `@/components/financeiro`). O uso interno do app já está 100% em `@/modules/financeiro/*`.

---

## 6. Estrutura final de `src/modules/financeiro`

```
src/modules/financeiro/
├── __tests__/
│   ├── README.md
│   └── services/
│       └── dashboard/
│           └── getDashboardSummary.example.test.ts
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
├── hooks/
├── lib/
│   ├── api-response.ts
│   ├── cn.ts
│   ├── db.ts
│   ├── primitives.ts
│   ├── cashFlowProjection.ts
│   ├── auth/
│   ├── household/
│   ├── marketing/
│   ├── supabase/
│   └── utils/
├── schemas/
│   └── index.ts
├── services/
│   ├── allocation-goals/
│   ├── cycles/
│   ├── dashboard/
│   ├── expenses/
│   ├── households/
│   ├── incomes/
│   ├── invites/
│   ├── leads/
│   ├── payment-days/
│   ├── rules/
│   └── sources/
└── types/
    ├── index.ts
    ├── contracts.ts
    └── domain.ts
```

---

## 7. Build final

- **Comando:** `pnpm run build`
- **Status:** Sucesso (exit 0).
- Comportamento de rotas, respostas e schema do banco mantidos.

---

## 8. Próximos passos recomendados (Sprint 3)

1. **Testes:** Adicionar Vitest e implementar testes unitários para os services (prioridade: dashboard, expenses, incomes, rules, sources).
2. **Remoção gradual de re-exports:** Se não houver mais dependentes de `@/lib/financeiro` e `@/components/financeiro`, planejar remoção dos re-exports ou migração final e depois apagar essas pastas.
3. **Consistência de tipos:** Passar a usar `types/domain` e `types/contracts` nos services e nas páginas onde ainda existem tipos locais (ex.: MemberItem já definido em listMembers e em domain).
4. **Documentação de API:** Manter ou gerar documentação (OpenAPI/Swagger) das rotas do financeiro a partir dos mesmos contratos (schemas Zod + types).
5. **E2E:** Incluir fluxos do módulo financeiro em testes E2E (Playwright) para regressão de rotas e contratos.
