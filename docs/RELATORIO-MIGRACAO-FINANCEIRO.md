# Relatório da Migração do Financeiro para o DevFlow

**Data:** 14 de março de 2025  
**Origem:** `/home/gustavo/Documentos/Financeiro`  
**Destino:** `/home/gustavo/Documentos/devflow`

---

## FASE 1 – Dependências e Prisma ✅ CONCLUÍDA

| Item | Status | Observação |
|------|--------|------------|
| Dependências no package.json | ✅ | `@supabase/ssr`, `@supabase/supabase-js`, `@prisma/client`, `recharts`, `sonner`, `resend`, `posthog-js`, `zod` já estavam presentes |
| Prisma como devDependency | ✅ | Já estava configurado |
| `prisma/schema.prisma` | ✅ | Copiado de `Financeiro/packages/database/prisma/schema.prisma` |
| Migrações Prisma | ✅ | Pastas `prisma/migrations/` copiadas do Financeiro |
| Scripts npm | ✅ | `db:generate`, `db:migrate`, `db:migrate:deploy` já existiam |

---

## FASE 2 – Lib financeiro ✅ CONCLUÍDA

| Item | Status | Localização |
|------|--------|-------------|
| PrismaClient (db.ts) | ✅ | `src/lib/financeiro/db.ts` |
| api-response.ts | ✅ | `src/lib/financeiro/api-response.ts` (buildSuccessPayload, buildErrorPayload, sendSuccess, sendError) |
| Supabase server | ✅ | `src/lib/financeiro/supabase/server.ts` |
| Supabase client | ✅ | `src/lib/financeiro/supabase/client.ts` |
| Supabase middleware-client | ✅ | `src/lib/financeiro/supabase/middleware-client.ts` (updateSession) |
| HouseholdProvider | ✅ | `src/lib/financeiro/household/HouseholdProvider.tsx` |

---

## FASE 3 – Schema e Utils ✅ CONCLUÍDA

### Arquivos em `Financeiro/packages/schema/src`
- `index.ts` → conteúdo já em `src/lib/financeiro/schema.ts`

### Arquivos em `Financeiro/packages/utils/src`
- `response.ts` → `src/lib/financeiro/utils/response.ts`
- `index.ts` → `src/lib/financeiro/utils/index.ts`

### Estrutura final de `src/lib/financeiro/`
```
src/lib/financeiro/
├── api-response.ts      # sendSuccess, sendError (usa utils)
├── db.ts                # PrismaClient singleton
├── schema.ts            # Schemas Zod (auth, household, source, expense, income, rules, etc.)
├── utils/
│   ├── index.ts
│   └── response.ts      # buildSuccessPayload, buildErrorPayload, tipos
├── supabase/
│   ├── server.ts
│   ├── client.ts
│   └── middleware-client.ts
├── household/
│   └── HouseholdProvider.tsx
├── cn.ts
└── primitives.ts
```

---

## O QUE FALTA (próximas fases)

### 1. Middleware
- **Status:** ❌ Não existe
- **O quê:** Criar `src/middleware.ts` que chame `updateSession` de `@/lib/financeiro/supabase/middleware-client`
- **Referência:** `Financeiro/apps/web/middleware.ts`

### 2. API Routes (37 arquivos no Financeiro)
Rotas a migrar:
- `api/me/route.ts`, `api/me/active-household/route.ts`
- `api/households/route.ts`, `api/households/[householdId]/members/route.ts`, `api/households/[householdId]/members/[membershipId]/route.ts`, `api/households/[householdId]/transfer-ownership/route.ts`
- `api/invites/route.ts`, `api/invites/[inviteId]/route.ts`, `api/invites/accept/route.ts`
- `api/sources/route.ts`, `api/sources/[sourceId]/route.ts`
- `api/expenses/route.ts`, `api/expenses/[expenseId]/route.ts`
- `api/incomes/route.ts`, `api/incomes/[incomeId]/route.ts`
- `api/cycles/route.ts`, `api/cycles/[cycleId]/route.ts`
- `api/payment-days/route.ts`, `api/payment-days/[paymentDayId]/route.ts`
- `api/rules/route.ts`, `api/rules/[ruleId]/route.ts`, `api/rules/allocations/route.ts`
- `api/income-allocation-goals/route.ts`, `api/income-allocation-goals/[goalId]/route.ts`
- `api/personal-allocation-goals/route.ts`, `api/personal-allocation-goals/[goalId]/route.ts`
- `api/dashboard/summary/route.ts`, `api/dashboard/cash-flow-projection/route.ts`
- `api/marketing/leads/route.ts`, `api/marketing/dispatch/route.ts`, `api/marketing/newsletter/route.ts`, `api/marketing/whatsapp/route.ts`, `api/marketing/metrics/route.ts`
- `api/health/route.ts`
- Helpers: `api/_helpers/auth.ts`, `api/_helpers/household.ts`, `api/_helpers/sameOrigin.ts`

### 3. Páginas
Páginas do app financeiro a considerar:
- `/auth`, `/auth/callback`, `/auth/reset`, `/auth/update-password`
- `/onboarding`, `/dashboard`, `/sources`, `/expenses`, `/rules`, `/settings`
- `/invites/accept`
- `/ferramentas` (parcialmente existem: despesas-fixas, projecao-financeira, dividir-contas)

### 4. Componentes
- Componentes específicos do dashboard, sources, expenses, rules, invites, settings, onboarding
- Layout das páginas protegidas (sidebar, header com household switcher, etc.)

### 5. Outras libs do Financeiro (não migradas)
- `lib/auth/activeHousehold.ts`
- `lib/dashboard/cashFlowProjection.ts`
- `lib/dates.ts`, `lib/audit.ts`, `lib/email.ts`
- `lib/marketing/*` (service, templates, constants, auth)
- `lib/rateLimit.ts`
- `lib/analytics/*`, `lib/seo/*`, `lib/freemium/*`

---

## Variáveis de ambiente necessárias

```
DATABASE_URL=postgresql://...
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
# ou NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
```

---

## Resumo

| Categoria | Concluído | Pendente |
|-----------|-----------|----------|
| Dependências e Prisma | ✅ 100% | - |
| Lib financeiro (core) | ✅ 100% | - |
| Schema e utils | ✅ 100% | - |
| Middleware | - | ❌ 1 arquivo |
| API routes | - | ❌ ~37 arquivos |
| Páginas | - | ❌ ~20 páginas |
| Componentes UI | - | ❌ Muitos |
| Libs auxiliares | - | ❌ auth, dates, audit, marketing, etc. |
