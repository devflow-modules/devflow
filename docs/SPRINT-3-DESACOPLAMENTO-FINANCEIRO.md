# Sprint 3 — Desacoplamento do Módulo Financeiro

**Data:** 2026-03-11  
**Objetivo:** Eliminar re-exports legados, criar adapters de infraestrutura, implementar testes reais e preparar o módulo para possível extração futura, sem alterar rotas, contratos ou schema do banco.

---

## 1. Arquivos removidos (re-exports legados)

### src/lib/financeiro/

- `db.ts`
- `api-response.ts`
- `schema.ts`
- `cn.ts`
- `primitives.ts`
- `utils/index.ts`
- `utils/response.ts`
- `supabase/client.ts`
- `supabase/server.ts`
- `supabase/middleware-client.ts`
- `auth/activeHousehold.ts`
- `marketing/service.ts`
- `household/HouseholdProvider.tsx`

### src/components/financeiro/

- `Breadcrumbs.tsx`
- `Sidebar.tsx`
- `Skeleton.tsx`
- `LeadCaptureForm.tsx`
- `AppShell.tsx`
- `MonthlyTrendChart.tsx`
- `SimuladorRapidoFinanceiro.tsx`
- `FinanceiroTools.tsx`
- `CashFlowProjectionChart.tsx`
- `DividirContasTool.tsx`
- `ProjecaoFinanceiraTool.tsx`
- `DespesasFixasTool.tsx`

**Total:** 25 arquivos removidos. Nenhum consumidor usava mais esses caminhos; todos já importavam de `@/modules/financeiro/*`.

---

## 2. Imports corrigidos

Nenhum import precisou ser alterado na Sprint 3 para “substituir legado”, pois já estavam em `@/modules/financeiro/*` desde a Sprint 2. Foram feitas as seguintes atualizações:

- **Prisma:** Todas as rotas de API do financeiro passaram a importar `prisma` de `@/modules/financeiro/adapters/prisma/prismaFinanceiro` em vez de `@/modules/financeiro/lib/db`.
- **Cookies:** Rotas que setam/removem o cookie de casa ativa passaram a usar `setActiveHouseholdCookie`, `deleteActiveHouseholdCookie` e `getActiveHouseholdFromRequest` de `@/modules/financeiro/adapters/cookies/householdCookie`.
- **Auth helper:** `_helpers/auth.ts` passou a usar `getActiveHouseholdCookieName` e `getActiveHouseholdFromRequest` do adapter de cookies e `prisma` do adapter Prisma.

Arquivos alterados para uso dos adapters:

- `src/app/api/_helpers/auth.ts`
- `src/app/api/me/route.ts`
- `src/app/api/me/active-household/route.ts`
- `src/app/api/households/route.ts`
- `src/app/api/households/[householdId]/members/[membershipId]/route.ts`
- `src/app/api/invites/accept/route.ts`
- Todas as rotas que importavam `prisma` de `lib/db` (dashboard, expenses, incomes, rules, sources, cycles, payment-days, invites, households, allocation-goals, leads, health).

---

## 3. Adapters criados

| Adapter | Responsabilidade |
|--------|-------------------|
| **adapters/prisma/prismaFinanceiro.ts** | `getPrisma()`, re-export de `prisma` — ponto único de acesso ao Prisma para o domínio. |
| **adapters/auth/authContext.ts** | Tipos `AuthContext`, `AuthHouseholdContext`, `AuthSessionContext`. |
| **adapters/cookies/householdCookie.ts** | `ACTIVE_HOUSEHOLD_COOKIE_NAME`, `getActiveHouseholdCookieName()`, `getActiveHouseholdFromRequest(request)`, `setActiveHouseholdCookie(response, householdId)`, `deleteActiveHouseholdCookie(response)`. |
| **adapters/analytics/financeAnalytics.ts** | `trackFinanceEvent(prisma, params)` — encapsula eventos de analytics do fluxo financeiro. |
| **adapters/index.ts** | Barrel dos adapters. |

---

## 4. Services

Os services já estavam sem dependência de Next.js (recebem `prisma` e DTOs/contexto). Nenhuma assinatura foi alterada nesta sprint. A camada de rotas continua obtendo `prisma` do adapter e passando para os services; cookies são tratados nas rotas com o adapter de cookies.

---

## 5. Testes implementados

- **Vitest** adicionado ao projeto (`vitest` em devDependencies, `vitest.config.ts` com alias `@` e `test`/`test:watch` em `package.json`).
- **Testes criados:**
  - `src/modules/financeiro/__tests__/services/dashboard/getDashboardSummary.test.ts` — 2 testes: série com totais zerados sem dados; chamadas ao Prisma com `householdId` e estrutura de `series`.
  - `src/modules/financeiro/__tests__/services/expenses/listExpenses.test.ts` — 2 testes: lista vazia; retorno de despesas do household com mock do Prisma.
- **Removido:** `getDashboardSummary.example.test.ts` (placeholder comentado).
- **Execução:** `pnpm test` — 2 arquivos, 4 testes passando.

---

## 6. Estrutura final de `src/modules/financeiro`

```
src/modules/financeiro/
├── __tests__/
│   ├── README.md
│   └── services/
│       ├── dashboard/
│       │   └── getDashboardSummary.test.ts
│       └── expenses/
│           └── listExpenses.test.ts
├── adapters/
│   ├── index.ts
│   ├── prisma/
│   │   └── prismaFinanceiro.ts
│   ├── auth/
│   │   └── authContext.ts
│   ├── cookies/
│   │   └── householdCookie.ts
│   └── analytics/
│       └── financeAnalytics.ts
├── components/
│   └── (AppShell, Breadcrumbs, charts, tools, etc.)
├── constants/
│   └── index.ts
├── hooks/
├── lib/
│   └── (db, supabase, api-response, auth, household, marketing, utils)
├── schemas/
│   └── index.ts
├── services/
│   ├── dashboard/
│   ├── expenses/
│   ├── incomes/
│   ├── rules/
│   ├── sources/
│   ├── cycles/
│   ├── payment-days/
│   ├── invites/
│   ├── households/
│   ├── allocation-goals/
│   └── leads/
├── types/
│   ├── index.ts
│   ├── contracts.ts
│   └── domain.ts
└── index.ts          # barrel: types, schemas, constants
```

---

## 7. Build

- **Comando:** `pnpm run build`
- **Status:** Sucesso (exit 0).
- **Testes:** `pnpm test` — 4 testes passando.

---

## 8. Documentação

- **docs/FINANCEIRO-MODULE-ARCHITECTURE.md** — Arquitetura do módulo: responsabilidades de cada pasta, dependências externas, como importar, como adicionar novas features e notas para extração futura.

---

## Resumo

- Re-exports em `src/lib/financeiro` e `src/components/financeiro` removidos; nenhum consumidor restante.
- Adapters de Prisma, cookies, auth (tipos) e analytics criados; rotas e auth helper passaram a usá-los.
- Vitest configurado; 4 testes reais para dashboard e expenses.
- Estrutura do módulo documentada em `FINANCEIRO-MODULE-ARCHITECTURE.md`.
- Rotas, contratos de API e schema do banco inalterados; sistema permanece 100% funcional em produção.
