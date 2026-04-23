# Rotas do ecossistema DevFlow Labs (devflowlabs.com.br)

Documento único de referência das rotas do monorepo em relação ao domínio **https://devflowlabs.com.br/**: qual app serve cada conjunto de rotas e como site, financeiro e demais produtos se encaixam no ecossistema.

**Índice do ecossistema:** [README.md](./README.md) · **Topologia:** [TOPOLOGIA-DEVFLOW.md](./TOPOLOGIA-DEVFLOW.md) · **Fluxograma:** [FLUXOGRAMA-DEVFLOW.md](./FLUXOGRAMA-DEVFLOW.md)

> **Foco de comunicação pública atual:** **WhatsApp Platform** e **Financeiro** no hub `devflowlabs.com.br`. Rotas de outros produtos (ex. landings históricas) podem permanecer no código; o posicionamento comercial principal segue o [WHATSAPP-PLATFORM-OVERVIEW](../whatsapp/WHATSAPP-PLATFORM-OVERVIEW.md) e a documentação do Financeiro. **CRM interno:** `/admin/leads` e `/admin/lead-finder` — [docs/crm/README.md](../crm/README.md).

---

## 1. Introdução

- **Domínio canônico:** https://devflowlabs.com.br
- **App que serve o domínio:** aplicação Next.js na **raiz do repositório** (`src/`), com `next dev` / `next build` / `next start` na raiz. Não há `basePath` configurado; todas as rotas são relativas à raiz do domínio.
- **Outros apps** em `apps/` (site, financeiro, whatsapp-platform, funklab, investigamais, ops) podem ser deployados como projetos separados (ex.: Financeiro em outro domínio com Supabase Auth). Quando servidos sob devflowlabs.com.br, seria via proxy/rewrite; hoje o que responde em devflowlabs.com.br é apenas o app da raiz.

---

## 2. App principal (raiz) — rotas em devflowlabs.com.br

**Origem:** `src/app/` + `next.config.ts` na raiz.  
**Base URL:** `https://devflowlabs.com.br` (definido em `src/app/sitemap.ts` e em vários `baseUrl` no código).

### 2.1 Páginas — Marketing e conteúdo

| Rota | Descrição |
|------|-----------|
| `/` | Home |
| `/automacao-whatsapp` | Automação WhatsApp |
| `/automacao-whatsapp-restaurante` | Automação restaurante |
| `/automacao-whatsapp-tabacaria` | Automação tabacaria |
| `/automacao-whatsapp-loja` | Automação loja |
| `/automacao-whatsapp-clinica` | Automação clínica |
| `/chatbot-whatsapp` | Chatbot WhatsApp |
| `/software-atendimento-whatsapp` | Software atendimento |
| `/produtos/whatsapp-platform` | Produto WhatsApp Platform |
| `/produtos/funklab-studio` | FunkLab (narrativa; não é foco do lançamento público atual) |
| `/demo` | Demo automação |
| `/precos` | Preços |
| `/pricing` | Pricing (inglês) |
| `/blog` | Lista blog |
| `/blog/[slug]` | Post do blog |
| `/projetos` | Projetos |
| `/contato` | Contato |
| `/sobre` | Sobre |
| `/termos` | Termos de uso |
| `/privacidade` | Privacidade |
| `/cookies` | Cookies |
| `/planilha-vs-app-financeiro` | Planilha vs app financeiro |

### 2.2 Páginas — Billing e admin

| Rota | Descrição |
|------|-----------|
| `/upgrade` | Upgrade (billing) |
| `/billing` | Billing |
| `/admin/metrics` | Admin métricas |
| `/admin/leads` | CRM comercial outbound (leads) |
| `/admin/lead-finder` | Atalho Google Maps + criação rápida de lead |

### 2.3 Páginas — Ferramentas

| Rota | Descrição |
|------|-----------|
| `/ferramentas` | Hub de ferramentas |
| `/ferramentas/divisao-de-contas` | Divisão de contas |
| `/ferramentas/consulta-cnpj` | Consulta CNPJ |

### 2.4 Páginas — Financeiro (base `/ferramentas/financeiro`)

| Rota | Descrição |
|------|-----------|
| `/ferramentas/financeiro` | Landing financeiro |
| `/ferramentas/financeiro/auth` | Login/cadastro Supabase |
| `/ferramentas/financeiro/auth/callback` | Callback OAuth (Supabase redirect) |
| `/ferramentas/financeiro/onboarding` | Onboarding |
| `/ferramentas/financeiro/dashboard` | Dashboard |
| `/ferramentas/financeiro/sources` | Fontes de renda |
| `/ferramentas/financeiro/expenses` | Despesas |
| `/ferramentas/financeiro/rules` | Regras |
| `/ferramentas/financeiro/settings` | Configurações |
| `/ferramentas/financeiro/invites/accept` | Aceitar convite |

### 2.5 APIs — App principal (raiz)

Checkout, customer-portal e webhook Stripe do produto Financeiro estão **só** em `apps/financeiro` (§4.2), não na raiz.

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/health` | Health check |
| GET | `/api/admin/metrics` | Métricas admin |
| GET | `/api/admin/revenue` | Receita admin |
| GET | `/api/me` | Usuário autenticado |
| POST | `/api/me/active-household` | Definir household ativo |
| GET | `/api/dashboard/summary` | Resumo dashboard |
| GET | `/api/dashboard/cash-flow-projection` | Projeção fluxo de caixa |
| GET, POST | `/api/expenses` | Listar/criar despesas |
| PATCH, DELETE | `/api/expenses/[expenseId]` | Atualizar/remover despesa |
| GET, POST | `/api/incomes` | Listar/criar receitas |
| PATCH, DELETE | `/api/incomes/[incomeId]` | Atualizar/remover receita |
| GET, POST | `/api/sources` | Listar/criar fontes |
| PATCH, DELETE | `/api/sources/[sourceId]` | Atualizar/remover fonte |
| GET, POST | `/api/rules` | Listar/criar regras |
| PATCH, DELETE | `/api/rules/[ruleId]` | Atualizar/remover regra |
| GET | `/api/rules/allocations` | Alocações de regras |
| GET, POST | `/api/cycles` | Listar/criar ciclos |
| GET, PATCH, DELETE | `/api/cycles/[cycleId]` | Ciclo por ID |
| GET, POST | `/api/payment-days` | Dias de pagamento |
| PATCH, DELETE | `/api/payment-days/[paymentDayId]` | Dia de pagamento por ID |
| GET, POST | `/api/personal-allocation-goals` | Metas de alocação pessoal |
| PATCH, DELETE | `/api/personal-allocation-goals/[goalId]` | Meta pessoal por ID |
| GET, POST | `/api/income-allocation-goals` | Metas de alocação de receita |
| PATCH, DELETE | `/api/income-allocation-goals/[goalId]` | Meta de receita por ID |
| POST | `/api/households` | Criar household |
| GET | `/api/households/[householdId]/members` | Membros do household |
| POST | `/api/households/[householdId]/transfer-ownership` | Transferir propriedade |
| DELETE | `/api/households/[householdId]/members/[membershipId]` | Remover membro |
| GET, POST | `/api/invites` | Listar/criar convites |
| DELETE | `/api/invites/[inviteId]` | Remover convite |
| POST | `/api/invites/accept` | Aceitar convite |
| POST | `/api/financeiro/leads` | Captura de leads financeiro |
| POST | `/api/analytics/growth` | Analytics crescimento |
| GET | `/api/tools/cnpj/[cnpj]` | Consulta CNPJ |
| — | `/api/webhook/whatsapp` | **Não** exposto na raiz após cutover — canónico só em **`apps/whatsapp-platform`** (ex.: `https://whatsapp.devflowlabs.com.br/api/webhook/whatsapp`). |

Com **`NEXT_PUBLIC_WHATSAPP_APP_URL`**, o middleware da raiz envia **308** para o host do app nos paths operacionais do WhatsApp (`/login`, `/inbox`, `/dashboard/whatsapp`, …; lista em `@devflow/whatsapp-routes`). Landings SEO (`/produtos/whatsapp-platform`, `/automacao-whatsapp*`, …) **permanecem** no portal. Detalhes: [CUTOVER-WHATSAPP-RUNBOOK-MAIN.md](../architecture/CUTOVER-WHATSAPP-RUNBOOK-MAIN.md).

---

## 3. Callbacks de autenticação (Supabase)

Para o **Financeiro** rodando no mesmo domínio (app da raiz):

- **Redirect URL obrigatória no Supabase (URL Configuration):**  
  `https://devflowlabs.com.br/ferramentas/financeiro/auth/callback`

Não há rota `/auth/callback` na raiz do domínio; o callback do Financeiro está sempre sob `/ferramentas/financeiro/auth/callback`. Ao configurar o Supabase para o app da raiz, use apenas essa URL (e, em dev, `http://localhost:3000/ferramentas/financeiro/auth/callback` se aplicável).

Quando o **Financeiro** é deployado como app separado (ex.: financeiro-pi-drab.vercel.app), configure no Supabase:

- **Site URL:** `https://financeiro-pi-drab.vercel.app` (ou o domínio do app)
- **Redirect URLs:**  
  - `https://financeiro-pi-drab.vercel.app/auth/callback`  
  - `https://financeiro-pi-drab.vercel.app/ferramentas/financeiro/auth/callback`  
  (conforme as rotas que o app usa para callback.)

---

## 4. Outros apps no monorepo (deploy opcional/separado)

Cada app abaixo tem suas próprias rotas; quando deployados em outro domínio (ex.: Vercel com projeto próprio), as URLs são relativas a esse domínio.

### 4.1 apps/site

- **Porta em dev:** 3000  
- **Uso:** build alternativo do site ou deploy separado. Estrutura de páginas de marketing e ferramentas equivalente à raiz (home, automacao-whatsapp, blog, projetos, contato, ferramentas, produtos, demo, precos, termos, privacidade, cookies, etc.). Não listamos rotas duplicadas aqui; ver `apps/site/src/app/` para detalhes.

### 4.2 apps/financeiro (Financeiro Casa)

- **Base path:** `/ferramentas/financeiro` (`FINANCEIRO_BASE_PATH` em `@devflow/financeiro-routes`; no app também em `apps/financeiro/src/modules/financeiro/constants/index.ts`; no portal, consumidores importam o package diretamente ou via `src/modules/financeiro/index.ts`).  
- **Porta em dev:** 3001  
- **Páginas:** `/`, `/ferramentas`, `/ferramentas/financeiro`, `/ferramentas/financeiro/auth`, `/ferramentas/financeiro/auth/callback`, `/ferramentas/financeiro/onboarding`, `/ferramentas/financeiro/dashboard`, `/ferramentas/financeiro/sources`, `/ferramentas/financeiro/expenses`, `/ferramentas/financeiro/rules`, `/ferramentas/financeiro/settings`, `/ferramentas/financeiro/invites/accept`, `/ferramentas/divisao-de-contas`, `/upgrade`, `/billing`, `/admin/metrics`.  
- **APIs:** espelho do financeiro da raiz sob `/api/*` (households, expenses, incomes, rules, sources, cycles, payment-days, invites, me, dashboard, billing, budgets, categories, etc.). Ver `apps/financeiro/src/app/api/` para lista exata.

### 4.3 apps/whatsapp-platform

- **Porta em dev:** 3000  
- **Deploy típico:** subdomínio dedicado (ex.: **`https://whatsapp.devflowlabs.com.br`** em produção).  
- **Páginas:** `/`, `/login`, `/signup`, `/onboarding`, `/dashboard`, `/admin/login`, `/admin/conversations`, `/admin/conversations/[id]`, `/admin/distribuir`, `/admin/metrics`, `/admin/agents`, `/queues`, `/agents`, `/settings`, `/conversations`.  
- **APIs:** auth (login, signup, logout), tenants (me, api-key), queues, agents, admin (queue/next, conversations, export, agent-status, feedback-report, metrics), stripe webhook, health, dashboard/conversations, faq, webhooks/whatsapp, etc. Ver `apps/whatsapp-platform/src/app/api/` para lista completa.

### 4.4 apps/funklab

- **Porta em dev:** conforme `package.json`.  
- **Páginas:** `/`.  
- **APIs:** `GET /api/health`. Deploy normalmente separado.

### 4.5 apps/investigamais

- **Páginas:** `/`, `/login`, `/admin/login`, `/admin/metrics`, `/dashboard`, `/dashboard/consulta`, `/dashboard/historico`, `/dashboard/perfil`, `/dashboard/assinatura`.  
- **APIs:** auth (login, logout, verify), admin (login, metrics), consulta, perfil, billing/status, webhooks/compra-confirmada, ops/metrics, health. Deploy normalmente separado.

### 4.6 apps/ops

- **Páginas:** `/`.  
- **APIs:** `GET /api/health`. Deploy normalmente separado.

---

## 5. Redirects e sitemap (app da raiz)

- **Redirect (next.config.ts):**  
  - `/segmentos/tabacarias` → `/automacao-whatsapp-tabacaria` (permanente).

- **Sitemap (SEO):** gerado em `src/app/sitemap.ts` com `baseUrl = "https://devflowlabs.com.br"`. Inclui as rotas principais listadas na seção 2 (home, automacao-whatsapp, produtos, demo, precos, blog, projetos, ferramentas, ferramentas/financeiro, ferramentas/divisao-de-contas, planilha-vs-app-financeiro, contato, privacidade, termos, cookies, sobre) e posts do blog por slug. Para alterar prioridade ou frequência, editar `src/app/sitemap.ts`.

---

## 6. Visão consolidada

Tudo que hoje responde em **https://devflowlabs.com.br/** vem do **app da raiz** (`src/`):

- **Marketing e conteúdo:** `/`, `/automacao-whatsapp*`, `/produtos/*`, `/demo`, `/precos`, `/blog`, `/projetos`, `/contato`, `/sobre`, `/termos`, `/privacidade`, `/cookies`, `/planilha-vs-app-financeiro`.  
- **Ferramentas:** `/ferramentas`, `/ferramentas/divisao-de-contas`, `/ferramentas/consulta-cnpj`, `/ferramentas/financeiro/*` (landing, auth, callback, dashboard, sources, expenses, rules, settings, onboarding, invites).  
- **Billing/Admin:** `/pricing`, `/upgrade`, `/billing`, `/admin/metrics`.  
- **APIs:** todas em `/api/*` listadas na seção 2.5.

Nenhum `basePath` está configurado no Next.js da raiz; todas as rotas são relativas à raiz do domínio.
