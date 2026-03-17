# Sprint de Homologação — Financeiro Daily Driver

> **Objetivo:** Transformar o módulo de "funciona bem" em "uso diário confiável que substitui qualquer planilha"  
> **App:** `apps/financeiro/` — Next.js 15, Prisma, Supabase, Tailwind v4  
> **Data:** Março 2026

---

## Status Geral

| Fase | Descrição | Status |
|------|-----------|--------|
| 1 | Seed com dados reais simulados | ✅ Completo |
| 3 | Recorrência hardening (recurrenceParentId) | ✅ Completo |
| 4 | Fechamento mensal (MonthSnapshot + Histórico) | ✅ Completo |
| 7 | Polish UI (labels, breadcrumbs, acesso rápido) | ✅ Completo |

---

## Fase 1 — Seed de Dados Reais

### O que foi feito
- Criado `prisma/seed.ts` — script TypeScript de seed idempotente
- Cobre 3 contextos: PERSONAL, BUSINESS (DevFlow Labs), SHARED (Estúdio)
- Dados criados:
  - 4 fontes de renda (Salário CLT, Freelas PF, DevFlow Labs, Estúdio)
  - 12 categorias com cores (Moradia, Alimentação, Transporte, Saúde, etc.)
  - 10 orçamentos mensais (budgets)
  - 8 receitas (mês atual + mês anterior)
  - 14 despesas fixas pagas (aluguel, plano, assinaturas, etc.)
  - 14 despesas variáveis pagas (mercado, uber, farmácia, etc.)
  - 8 despesas pendentes/vencidas (próximas contas + atrasadas)

### Como executar
```bash
cd apps/financeiro

# Seed básico (usa primeiro usuário do banco)
pnpm db:seed

# Seed para usuário específico
pnpm db:seed -- --email seu@email.com

# Seed com limpeza dos dados existentes
pnpm db:seed:reset -- --email seu@email.com
```

### Também foi aplicada a migration

A tabela `Category` e `Budget` não existiam no banco. Foi criada a migration:

```
prisma/migrations/20260317000002_add_category_budget/migration.sql
```

---

## Fase 3 — Recorrência Hardening

### Problema anterior
O campo `isRecurring` existia mas era apenas um marcador visual — não havia geração automática de instâncias, e editar/pagar uma despesa recorrente poderia quebrar o histórico.

### O que foi implementado

#### Schema
Adicionado `recurrenceParentId` em `Expense` e `Income`:
- Registros com `isRecurring = true` e `recurrenceParentId = null` são **templates**
- Registros gerados automaticamente têm `isRecurring = false` e `recurrenceParentId = <id do template>`
- Pagar/editar uma instância não afeta o template nem as demais instâncias

#### API
```
POST /api/recurrence
  Body: { year: number, month: number }
  → Gera instâncias do próximo mês para templates recorrentes
  → Idempotente: não duplica se instância já existir

GET /api/recurrence?year=&month=
  → Retorna contagem de templates e instâncias já geradas
```

#### Migration
```
prisma/migrations/20260317000003_recurrence_parent/migration.sql
```

### Como usar o fluxo de recorrência

1. Criar despesa com `isRecurring = true` → ela vira o **template**
2. No início do mês, acessar **Histórico** → botão "Gerar recorrências"
3. Instâncias são criadas para o próximo mês com `status = PENDING`
4. Pagar uma instância não afeta outras — cada mês é independente

---

## Fase 4 — Fechamento Mensal

### O que foi implementado

#### Schema
Novo modelo `MonthSnapshot`:
```prisma
model MonthSnapshot {
  id              String   @id @default(cuid())
  householdId     String
  year            Int
  month           Int
  totalIncomes    Decimal  // receitas RECEIVED no período
  totalExpenses   Decimal  // despesas PAID no período
  balance         Decimal  // totalIncomes - totalExpenses
  pendingExpenses Decimal  // despesas ainda PENDING no período
  notes           String?  // observações do OWNER
  closedAt        DateTime // quando foi fechado/atualizado
  ...
  @@unique([householdId, year, month])
}
```

#### APIs
```
GET  /api/month-snapshots       → lista todos os fechamentos do household
POST /api/month-snapshots       → fecha/recalcula um mês
  Body: { year, month, notes? }
  → Calcula totais direto do banco (não usa dados do cliente)
  → Upsert: pode fechar o mesmo mês várias vezes para atualizar
```

#### Página
`/ferramentas/financeiro/historico` (novo item na sidebar):
- Card do mês atual com botão "Fechar mês"
- Botão "Gerar recorrências" integrado
- Lista de fechamentos anteriores com saldo, receitas, despesas e pendentes
- Visual semântico: verde para saldo positivo, vermelho para negativo

#### Migration
```
prisma/migrations/20260317000004_month_snapshot/migration.sql
```

---

## Fase 7 — Polish UI

### Mudanças

| Item | Antes | Depois |
|------|-------|--------|
| Título página lançamentos | "Gestão financeira" | "Receitas & Despesas" |
| Label breadcrumb | "Entradas e saídas" | "Lançamentos" |
| Breadcrumbs | 4 rotas mapeadas | 8 rotas mapeadas (incluindo novas) |
| Dashboard | Sem acesso rápido | 3 cards de atalho (Próximas · Histórico · CSV) |
| Hint QuickAdd | Sem | "Use ⌘K para lançar em segundos" na página |

---

## Migrations aplicadas neste sprint

```
20260317000002_add_category_budget   → tabelas Category e Budget
20260317000003_recurrence_parent     → recurrenceParentId em Expense e Income
20260317000004_month_snapshot        → tabela MonthSnapshot
```

**Para aplicar em produção:**
```bash
cd apps/financeiro && pnpm db:migrate:deploy
```

---

## Checklist Final de Validação

### ✅ Deve passar em < 3 segundos
- [ ] Lançar despesa via `⌘K` → valor → categoria → Enter
- [ ] Marcar despesa como paga na página "Próximas Contas"
- [ ] Ver saldo atual no Dashboard (card "Saldo atual")

### ✅ Deve passar em < 10 segundos
- [ ] Entender o mês: Dashboard → KPI cards (receitas / despesas / saldo)
- [ ] Ver o que vence nos próximos 7 dias: "Próximas Contas" → 7 dias
- [ ] Identificar budget no limite: Dashboard → seção "Orçamento do mês" (badge vermelho)

### ✅ Clareza financeira
- [ ] Separar PF: ContextSelector → Pessoal
- [ ] Separar PJ: ContextSelector → Empresa
- [ ] Separar Estúdio: ContextSelector → Estúdio
- [ ] Ver visão consolidada: ContextSelector → Tudo

### ✅ Gestão mensal
- [ ] Fechar mês de teste em "Histórico"
- [ ] Gerar recorrências do próximo mês em "Histórico"
- [ ] Importar extrato CSV de teste em "Importar CSV"

---

## Estrutura atual de rotas do Financeiro

```
/ferramentas/financeiro/
├── dashboard         → KPIs, gráficos, budgets, filtro por contexto
├── expenses          → CRUD receitas e despesas + filtro por contexto
├── proximas-contas   → Despesas PENDING/SCHEDULED por vencimento
├── historico         → Fechamento mensal + geração de recorrências
├── importar          → Importação CSV com prévia e heurística
├── sources           → Fontes PJ/PF + ciclos e dias de pagamento
├── rules             → Regras de rateio
└── settings          → Casa ativa, membros, convites

/api/
├── expenses          → CRUD + filtros (context, from, to)
├── incomes           → CRUD + filtros (context, from, to)
├── sources           → CRUD
├── categories        → CRUD
├── budgets           → CRUD
├── rules             → CRUD + allocations
├── upcoming-expenses → GET próximas contas (days, context)
├── import-csv        → POST importação em massa
├── recurrence        → GET/POST geração de instâncias mensais
├── month-snapshots   → GET/POST fechamento mensal
└── dashboard/        → summary, cash-flow-projection, overview
```
