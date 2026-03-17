# Sprint Operacional — Financeiro Daily Driver

> **Objetivo:** Evoluir o módulo financeiro de MVP para um sistema que substitui planilha e app financeiro, com uso diário confiável.
>
> **App:** `apps/financeiro/` — Next.js 15, Prisma, Supabase, Tailwind v4  
> **Data:** Março 2026

---

## Status Geral

| Fase | Descrição | Status |
|------|-----------|--------|
| 1 | FinancialContext (PERSONAL / BUSINESS / SHARED) | ✅ Completo |
| 2 | QuickAdd modal global (⌘K) | ✅ Completo |
| 3 | Página Próximas Contas | ✅ Completo |
| 4 | Dashboard com filtro por contexto + cards coloridos | ✅ Completo |
| 5 | Budget visual alerts (80% amber, 100% danger) | ✅ Completo |
| 6 | Importação CSV | ✅ Completo |
| 7 | Visão consolidada "Tudo" | ✅ Via ContextSelector ALL |

---

## Fase 1 — FinancialContext

### O que foi feito
- Adicionado enum `FinancialContext { PERSONAL, BUSINESS, SHARED }` no Prisma schema (`apps/financeiro/prisma/schema.prisma`)
- Campo `context FinancialContext @default(PERSONAL)` adicionado em `Income` e `Expense`
- Índices criados: `(householdId, context)` em ambas as tabelas, mais `(householdId, dueDate)` e `(householdId, isRecurring)` em Expense
- Migration SQL idempotente: `prisma/migrations/20260317000001_financial_context/migration.sql`

### Como usar
- **Criar despesa com contexto:** `POST /api/expenses` com `{ ..., context: "BUSINESS" }`
- **Filtrar por contexto:** `GET /api/expenses?context=PERSONAL`
- **Filtrar por período:** `GET /api/expenses?from=2026-01-01&to=2026-01-31`

### Componentes UI
| Componente | Caminho | Uso |
|-----------|---------|-----|
| `ContextSelector` | `components/ContextSelector.tsx` | Filtro por botões pill (ALL / PERSONAL / BUSINESS / SHARED) |
| `ContextSelectField` | `components/ContextSelector.tsx` | Select dropdown em formulários |
| `ContextBadge` | `components/ContextSelector.tsx` | Badge colorida inline em listas |

### Mapeamento de contextos
| Contexto | Uso típico |
|----------|-----------|
| `PERSONAL` | Vida pessoal, despesas PF |
| `BUSINESS` | Empresa, receitas/custos PJ |
| `SHARED` | Estúdio, sociedade, conta compartilhada |

---

## Fase 2 — QuickAdd Modal (⌘K)

### O que foi feito
- `QuickAddModal.tsx` — modal com atalho `Cmd+K` / `Ctrl+K`
- Botão FAB fixo no canto inferior direito (desktop) e botão no header mobile
- Auto-fill: última categoria, última fonte, último contexto, data atual
- Toggle despesa / receita com cores diferentes (vermelho / verde)
- Toggle "Já foi pago" para marcar como PAID imediatamente
- Persiste preferências em `localStorage` (`financeiro.quickadd.last`)

### Como acionar
- Atalho de teclado: `⌘K` (Mac) / `Ctrl+K` (Windows/Linux)
- Botão FAB: canto inferior direito (desktop)
- Botão "+ Lançar": header mobile

---

## Fase 3 — Próximas Contas

### O que foi feito
- Nova rota: `GET /api/upcoming-expenses?days=30&context=PERSONAL`
  - Retorna despesas `PENDING | SCHEDULED` no horizonte de até `days` dias
  - Separa em `overdue` (atrasadas) e `upcoming` (futuras)
  - Retorna totais separados
- Nova página: `/ferramentas/financeiro/proximas-contas`
  - Cards de KPI para total atrasado e total próximo
  - Selector de horizonte: 7 / 14 / 30 / 60 / 90 dias
  - Filtro por contexto
  - Botão "Pagar" inline (marca como PAID com data atual)
  - Indicação visual de urgência (vermelho se atrasada, âmbar se ≤3 dias)

---

## Fase 4 — Dashboard Melhorado

### O que foi feito
- `ContextSelector` adicionado no header do dashboard
- Todos os cálculos (`totals`, `categoryBreakdown`, `allocationSummary`) filtram pelo contexto selecionado
- Cards de KPI redesenhados com cores semânticas:
  - **Receitas** → fundo verde claro, texto verde escuro
  - **Despesas** → fundo vermelho claro, texto vermelho
  - **Saldo negativo** → fundo vermelho claro + ícone de aviso
  - **Saldo positivo** → fundo indigo com valores

---

## Fase 5 — Budget Visual Alerts

### O que foi feito
- Seção "Orçamento do mês" no dashboard com alertas visuais:
  - **< 80%** → cor padrão da categoria
  - **80–99%** → âmbar + badge "80%" + fundo amarelo
  - **≥ 100%** → vermelho + badge "LIMITE!" + fundo vermelho
- Barra de progresso com `transition-all` para animação suave

---

## Fase 6 — Importação CSV

### O que foi feito
- `POST /api/import-csv` — processa até 500 linhas por vez
  - Heurística de categoria por palavras-chave (13 categorias mapeadas)
  - Todas as despesas importadas ficam como `PAID` com a data do extrato
  - Suporte a contexto e fonte padrão
  - Grava audit log

- Nova página: `/ferramentas/financeiro/importar`
  - Upload de arquivo `.csv` / `.txt`
  - Ou colar diretamente no textarea
  - Parser com suporte a separadores `;`, `,`, `tab`
  - Suporte a datas `dd/mm/yyyy`, `dd/mm/yy`, `yyyy-mm-dd`
  - Suporte a valores `350,00` ou `350.00` (ignora `R$`, espaços)
  - Prévia da tabela com validação por linha
  - Seletor de contexto e fonte padrão antes de importar

### Formato esperado
```csv
data;descricao;valor
01/01/2026;Supermercado Extra;350.00
05/01/2026;Conta de luz;89.50
```

### Categorias detectadas automaticamente
| Palavras-chave | Categoria |
|---------------|-----------|
| aluguel, moradia | Moradia |
| mercado, supermercado, ifood | Alimentação |
| uber, gasolina, pedágio, ônibus | Transporte |
| energia, luz, enel | Energia |
| internet, claro, vivo, tim | Telecom |
| farmácia, médico, saúde | Saúde |
| academia, esporte | Esporte |
| netflix, spotify, assinatura | Assinaturas |
| escola, faculdade, curso | Educação |
| salão, barbearia | Beleza |
| viagem, hotel, passagem | Viagem |
| (outros) | Outros |

---

## Fase 7 — Visão Consolidada

Implementada via o seletor de contexto "Tudo" (`ALL`) disponível em:
- Dashboard → mostra **todos os contextos agregados**
- Página Lançamentos → filtra "Tudo"
- Próximas Contas → filtra "Tudo"

---

## Rotas adicionadas

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/expenses?context=&from=&to=` | Listagem com filtros |
| GET | `/api/incomes?context=&from=&to=` | Listagem com filtros |
| GET | `/api/upcoming-expenses?days=&context=` | Próximas contas e atrasadas |
| POST | `/api/import-csv` | Importação CSV em massa |

---

## Migration

Para aplicar a migration na produção:

```bash
# Opção 1: via prisma migrate deploy
cd apps/financeiro && pnpm db:migrate:deploy

# Opção 2: direto no Supabase SQL Editor
# Conteúdo: prisma/migrations/20260317000001_financial_context/migration.sql
```

---

## Checklist de validação (Fase 8)

- [ ] Consegue lançar uma despesa em < 3s? → **⌘K** → valor → categoria → Enter
- [ ] Consegue ver saldo em < 2s? → **Dashboard** → card "Saldo atual"
- [ ] Consegue separar PF / PJ sem confusão? → **ContextSelector** no dashboard e nos lançamentos
- [ ] Consegue ver o que vence esta semana? → **Próximas Contas** → 7 dias
- [ ] Budget está no limite? → **Dashboard** → seção "Orçamento do mês" (card vermelho)
- [ ] Tem extrato bancário para importar? → **Importar CSV**
