# Separação App vs Growth — Módulo Financeiro

Este documento classifica as partes do projeto em **produto (app)** e **aquisição (growth)** para orientar evolução e métricas. **Nenhuma rota ou URL foi alterada**; a separação é conceitual e documental.

---

## APP (produto autenticado)

Funcionalidades que exigem usuário logado e casa ativa. Foco: valor do produto, retenção, uso.

### Páginas (App Router)

| Caminho | Descrição |
|--------|-----------|
| `/ferramentas/financeiro/dashboard` | Dashboard financeiro (resumo, gráficos) |
| `/ferramentas/financeiro/expenses` | Gestão de despesas |
| `/ferramentas/financeiro/sources` | Fontes de receita e dias de pagamento |
| `/ferramentas/financeiro/rules` | Regras de rateio |
| `/ferramentas/financeiro/settings` | Configurações (membros, convites, titularidade) |
| `/ferramentas/financeiro/onboarding` | Criação de primeira casa |
| `/ferramentas/financeiro/invites/accept` | Aceitar convite (pode ser acessado por link, mas consome produto) |
| `/ferramentas/financeiro/auth` | Login do produto |

### APIs (exigem auth e household)

- `/api/me`, `/api/me/active-household`
- `/api/dashboard/summary`, `/api/dashboard/cash-flow-projection`
- `/api/expenses`, `/api/expenses/[id]`
- `/api/incomes`, `/api/incomes/[id]`
- `/api/rules`, `/api/rules/[id]`, `/api/rules/allocations`
- `/api/sources`, `/api/sources/[id]`
- `/api/cycles`, `/api/cycles/[id]`
- `/api/payment-days`, `/api/payment-days/[id]`
- `/api/invites`, `/api/invites/[id]`, `/api/invites/accept`
- `/api/households`, `/api/households/[id]/members`, `.../transfer-ownership`, `.../members/[membershipId]`
- `/api/income-allocation-goals`, `/api/income-allocation-goals/[id]`
- `/api/personal-allocation-goals`, `/api/personal-allocation-goals/[id]`

---

## GROWTH (aquisição)

Páginas e endpoints voltados a SEO, captação de leads e conversão. Não exigem (ou não dependem de) sessão do produto.

### Páginas

| Caminho | Descrição |
|--------|-----------|
| `/ferramentas/financeiro` | Landing da ferramenta: simulador, captura de lead, links para produto |
| `/ferramentas/divisao-de-contas` | Ferramenta pública (ex.: dividir contas) |
| `/planilha-vs-app-financeiro` | Conteúdo de aquisição / comparação |
| `/ferramentas` | Listagem de ferramentas (pode misturar app e growth) |

### APIs

| Endpoint | Descrição |
|----------|-----------|
| `/api/financeiro/leads` | Captura de lead (e-mail, origem) para growth |

---

## Estrutura futura (opcional)

Se no futuro for desejável separar fisicamente sem alterar URLs:

- **Route groups** (Next.js):  
  - `(app)/ferramentas/financeiro/...` para rotas que exigem auth.  
  - `(growth)/ferramentas/financeiro/...` para landing e páginas públicas.  
  Os grupos não mudam a URL; apenas organizam o código.

- **Features** (alternativa):  
  - `src/features/financeiro-app/` — páginas e lógica do produto.  
  - `src/features/financeiro-growth/` — landing, simuladores, captura de lead.  
  Os módulos em `src/modules/financeiro` (services, adapters, schemas) permanecem compartilhados.

**Decisão atual:** não mover arquivos nem criar route groups; apenas documentar a separação para uso em métricas, priorização e futura refatoração.
