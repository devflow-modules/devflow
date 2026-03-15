# Status da Migração 100% — Financeiro → DevFlow

**Atualizado:** 2025-03-11

---

## Migração concluída (100%)

### Infraestrutura
- [x] Prisma + schema + migrations
- [x] Supabase (server, client, middleware)
- [x] Middleware de auth (protege rotas do app)
- [x] Libs: db, schema, api-response, auth, activeHousehold
- [x] HouseholdProvider, activeHousehold

### API Routes
- [x] /api/health
- [x] /api/me
- [x] /api/me/active-household
- [x] /api/households
- [x] /api/households/[householdId]/members
- [x] /api/households/[householdId]/members/[membershipId]
- [x] /api/households/[householdId]/transfer-ownership
- [x] /api/invites
- [x] /api/invites/[inviteId]
- [x] /api/invites/accept
- [x] /api/sources
- [x] /api/sources/[sourceId]
- [x] /api/expenses
- [x] /api/expenses/[expenseId]
- [x] /api/incomes
- [x] /api/incomes/[incomeId]
- [x] /api/cycles
- [x] /api/cycles/[cycleId]
- [x] /api/payment-days
- [x] /api/payment-days/[paymentDayId]
- [x] /api/rules
- [x] /api/rules/[ruleId]
- [x] /api/rules/allocations
- [x] /api/income-allocation-goals
- [x] /api/income-allocation-goals/[goalId]
- [x] /api/personal-allocation-goals
- [x] /api/personal-allocation-goals/[goalId]
- [x] /api/dashboard/summary
- [x] /api/dashboard/cash-flow-projection

### Páginas
- [x] /ferramentas/financeiro — ferramentas públicas (divisão, projeção, despesas fixas)
- [x] /ferramentas/financeiro/auth — login/cadastro
- [x] /ferramentas/financeiro/auth/callback — callback OAuth
- [x] /ferramentas/financeiro/dashboard — resumo financeiro com gráficos
- [x] /ferramentas/financeiro/onboarding — criar primeira casa
- [x] /ferramentas/financeiro/sources — fontes PJ/PF, ciclos, dias de recebimento
- [x] /ferramentas/financeiro/expenses — receitas e despesas
- [x] /ferramentas/financeiro/rules — regras de rateio
- [x] /ferramentas/financeiro/settings — conta, membros, convites
- [x] /ferramentas/financeiro/invites/accept — aceitar convite
- [x] /ferramentas/divisao-de-contas — calculadora dedicada

### Componentes
- [x] Sidebar (navegação do app)
- [x] AppShell (layout com Sidebar para rotas protegidas)
- [x] Breadcrumbs
- [x] CashFlowProjectionChart
- [x] MonthlyTrendChart
- [x] Skeleton

### Layout
- [x] BodyChrome — oculta Header/Footer nas rotas do app financeiro
- [x] Layout do financeiro com HouseholdProvider + Toaster + AppShell para rotas protegidas

---

## Envs necessárias

```env
# Obrigatórias para o app financeiro
DATABASE_URL=postgresql://...
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# Opcionais
NEXT_PUBLIC_APP_URL=https://devflowlabs.com.br
RESEND_API_KEY=...        # para e-mails (convites)
RESEND_FROM=...
NEXT_PUBLIC_POSTHOG_KEY=... # analytics
```

---

## Deploy

1. Configurar envs na Vercel (Supabase, DATABASE_URL)
2. Rodar `pnpm db:migrate:deploy` antes do deploy
3. Configurar redirect URLs no Supabase: `https://devflowlabs.com.br/ferramentas/financeiro/auth/callback`

---

## Próximos passos (opcionais)

- [ ] api/marketing/* (leads, dispatch, newsletter, whatsapp, metrics) — se necessário
- [ ] Página de reset de senha (/ferramentas/financeiro/auth/reset)
- [ ] Atualização de senha (/ferramentas/financeiro/auth/update-password)
