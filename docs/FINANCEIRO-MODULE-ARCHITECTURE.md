# Arquitetura do Módulo Financeiro

Este documento descreve a estrutura e as responsabilidades do módulo financeiro em `src/modules/financeiro/`, preparado para possível extração futura (pacote ou micro-SaaS).

---

## Estrutura de pastas

```
src/modules/financeiro/
├── adapters/          # Infraestrutura (Prisma, cookies, auth types, analytics)
├── components/        # Componentes React (UI do fluxo financeiro)
├── constants/         # Constantes do domínio
├── hooks/             # Hooks React (ex.: useHousehold em lib/household)
├── lib/               # Utilitários: db, supabase, api-response, cn, primitives, auth, household, marketing
├── schemas/           # Validação Zod (input/output)
├── services/         # Lógica de negócio (por domínio)
├── types/             # Contratos e tipos de domínio
├── __tests__/         # Testes unitários (Vitest)
└── index.ts           # Barrel: types, schemas, constants
```

---

## Responsabilidades

### adapters/

- **prisma/prismaFinanceiro.ts** — Ponto único de acesso ao cliente Prisma para o domínio. Rotas obtêm o client via `getPrisma()` ou `prisma` e passam para os services.
- **auth/authContext.ts** — Tipos de contexto de autenticação (`AuthContext`, `AuthHouseholdContext`, `AuthSessionContext`) usados pela camada de app.
- **cookies/householdCookie.ts** — Leitura/escrita do cookie de casa ativa: `getActiveHouseholdFromRequest`, `setActiveHouseholdCookie`, `deleteActiveHouseholdCookie`, `getActiveHouseholdCookieName`.
- **analytics/financeAnalytics.ts** — Encapsulamento de eventos de analytics do fluxo financeiro (`trackFinanceEvent`).

### components/

Componentes React específicos do financeiro: AppShell, Breadcrumbs, charts, ferramentas (Simulador, Dividir Contas, etc.). Importe por path: `@/modules/financeiro/components/NomeDoComponente`.

### lib/

- **db.ts** — Singleton do Prisma (usado internamente; rotas preferem o adapter).
- **supabase/** — Cliente Supabase (server, client, middleware).
- **api-response.ts** — `sendSuccess`, `sendError` (respostas padronizadas da API).
- **auth/activeHousehold.ts** — Lógica pura de resolução de casa ativa a partir de cookie + memberships.
- **household/HouseholdProvider.tsx** — Contexto React de casa ativa.
- **marketing/service.ts** — Criação de eventos de marketing (usado por analytics adapter).

### schemas/

Validação Zod centralizada em `schemas/index.ts`: criação/atualização de household, source, cycle, expense, income, rule, invite, payment-day, allocation goals, leads, etc.

### services/

Lógica de negócio **sem dependência de Next.js**: não acessam request, response, cookies ou headers. Recebem dados já resolvidos (ex.: `prisma`, `householdId`, DTOs).

- **dashboard/** — getDashboardSummary, getCashFlowProjection
- **expenses/** — listExpenses, createExpense, updateExpense, deleteExpense
- **incomes/** — idem
- **rules/** — listRules, createRule, updateRule, deleteRule, getRuleAllocations
- **sources/** — listSources, createSource, updateSource, deleteSource
- **cycles/** — listCycles, getCycle, createCycle, updateCycle, deleteCycle
- **payment-days/** — list, create, update, delete
- **invites/** — listInvites, createInvite, revokeInvite, acceptInvite
- **households/** — createHousehold, listMembers, removeMember, transferOwnership, setActiveHousehold
- **allocation-goals/** — get/upsert/update/delete (income e personal)
- **leads/** — createLead

**Padrão de uso:** a rota valida auth, valida input (Zod), obtém `prisma` do adapter, chama o service com `(prisma, ...)` e contexto/DTO, e devolve `sendSuccess`/`sendError`. Cookies são setados na rota com funções do adapter de cookies.

### types/

- **contracts.ts** — Contratos de API e contextos (AuthHouseholdContext, AuthSessionContext, ListParams, ApiSuccessPayload, ApiErrorPayload).
- **domain.ts** — Tipos de domínio (MembershipRole, SourceType, RuleType, MemberItem, AllocationItem, etc.).

---

## Dependências externas

- **Prisma** — Acesso a dados; injetado via adapter.
- **Supabase** — Autenticação e sessão; usado pela camada de app (_helpers/auth), não pelos services.
- **Next.js** — Apenas nas rotas e em adapters que leem request/response (cookies). Os services não importam Next.
- **Zod** — Validação em schemas.
- **@/lib/audit** — Auditoria (createAuditLog) usada por vários services.
- **@/lib/email** — Envio de e-mail (ex.: convites) usado por services que precisam notificar.

---

## Como importar

- **Types/schemas/constants:** `import { ... } from "@/modules/financeiro"` ou `from "@/modules/financeiro/schemas"`, `from "@/modules/financeiro/types"`.
- **Services:** importe por domínio, ex.: `import { listExpenses, createExpense } from "@/modules/financeiro/services/expenses"`.
- **Lib:** `import { prisma } from "@/modules/financeiro/adapters/prisma/prismaFinanceiro"`, `import { sendSuccess } from "@/modules/financeiro/lib/api-response"`.
- **Components:** `import { Breadcrumbs } from "@/modules/financeiro/components/Breadcrumbs"`.

---

## Como adicionar novas features

1. **Novo endpoint:** criar rota em `src/app/api/...`; validar auth e input; obter `prisma` do adapter; chamar service; retornar sendSuccess/sendError; usar adapter de cookies se precisar setar cookie.
2. **Novo service:** criar arquivo em `services/<domínio>/` (ex.: `services/expenses/archiveExpense.ts`). Assinatura: receber `prisma` e parâmetros já resolvidos (householdId, DTO). Sem NextRequest/NextResponse.
3. **Novo schema:** adicionar em `schemas/index.ts` e exportar.
4. **Novo tipo público:** adicionar em `types/domain.ts` ou `types/contracts.ts` e exportar via `types/index.ts`.
5. **Testes:** adicionar em `__tests__/services/<domínio>/`; mockar Prisma; cobrir regras de negócio e edge cases.

---

## Extração futura

Para virar pacote ou micro-SaaS:

- Manter **adapters** como interface de infraestrutura: o consumidor implementa `getPrisma()`, cookies e auth conforme o ambiente.
- **Services** e **schemas** permanecem independentes de framework.
- **Components** podem depender de React e de tokens de design; documentar dependências (Tailwind, etc.).
- **lib/** pode ser dividida: utilitários puros (cn, primitives) vs. integrações (supabase, db), sendo as últimas substituídas por adapters injetados.
