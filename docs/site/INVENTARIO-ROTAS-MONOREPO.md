# Inventário de rotas e páginas por app (monorepo DevFlow)

**Decisão de dono / saneamento:** `MATRIZ-DECISAO-ROTAS.md`.  
**Policy e fases:** `docs/architecture/ROUTING_POLICY.md`, `docs/architecture/ROUTING_MIGRATION_EXECUCAO.md`.

**Como ler:** cada linha é o **path HTTP** (começando em `/`) relativo à origem desse app no deploy. Grupos `(nome)` em pastas do Next **não** entram na URL.

**Pacotes Next identificados**

| Pacote / origem | Pasta | Uso típico |
|-----------------|-------|------------|
| **Landing + Financeiro (legado integrado)** | `src/app` na raiz do repo | Site público, parte do Financeiro, login JWT WhatsApp, APIs compartilhadas |
| **App Financeiro** | `apps/financeiro` | Financeiro “puro” com rotas extras (contas, importar, histórico…) |
| **WhatsApp Platform** | `apps/whatsapp-platform` | Produto WhatsApp (inbox, billing, admin…) |
| **Investigamais** | `apps/investigamais` | App do produto Investiga+ |
| **FunkLab** | `apps/funklab` | Landing/app mínimo do FunkLab |
| **Ops** | `apps/ops` | Painel interno mínimo |
| **Site (espelho parcial)** | `apps/site` | Subconjunto de páginas de marketing (pode divergir da raiz) |

> Em **produção**, nem todo pacote precisa estar no **mesmo domínio**. O que importa é: qual `next build` responde em qual host — esse doc lista **o que existe no código**.

---

## 1. Landing + integrações na raiz (`src/app`)

Origem: repositório raiz, `src/app`. É o app Next “principal” quando você roda o projeto da raiz.

### 1.1 Páginas (UI)

| Rota | Arquivo (referência) |
|------|----------------------|
| `/` | `page.tsx` |
| `/como-funciona` | `como-funciona/page.tsx` |
| `/contato` | `contato/page.tsx` |
| `/sobre` | `sobre/page.tsx` |
| `/projetos` | `projetos/page.tsx` |
| `/precos` | `precos/page.tsx` |
| `/pricing` | `pricing/page.tsx` |
| `/upgrade` | `upgrade/page.tsx` |
| `/billing` | `billing/page.tsx` |
| `/demo` | `demo/page.tsx` |
| `/blog` | `blog/page.tsx` |
| `/blog/[slug]` | `blog/[slug]/page.tsx` |
| `/cookies` | `cookies/page.tsx` |
| `/termos` | `termos/page.tsx` |
| `/privacidade` | `privacidade/page.tsx` |
| `/ferramentas` | `ferramentas/page.tsx` |
| `/ferramentas/divisao-de-contas` | `ferramentas/divisao-de-contas/page.tsx` |
| `/ferramentas/consulta-cnpj` | `ferramentas/consulta-cnpj/page.tsx` |
| `/ferramentas/financeiro` | `ferramentas/financeiro/page.tsx` |
| `/ferramentas/financeiro/demo` | `ferramentas/financeiro/demo/page.tsx` |
| `/ferramentas/financeiro/auth` | `ferramentas/financeiro/auth/page.tsx` |
| `/ferramentas/financeiro/auth/callback` | `ferramentas/financeiro/auth/callback/page.tsx` |
| `/ferramentas/financeiro/onboarding` | `ferramentas/financeiro/onboarding/page.tsx` |
| `/ferramentas/financeiro/dashboard` | `ferramentas/financeiro/dashboard/page.tsx` |
| `/ferramentas/financeiro/expenses` | `ferramentas/financeiro/expenses/page.tsx` |
| `/ferramentas/financeiro/sources` | `ferramentas/financeiro/sources/page.tsx` |
| `/ferramentas/financeiro/rules` | `ferramentas/financeiro/rules/page.tsx` |
| `/ferramentas/financeiro/settings` | `ferramentas/financeiro/settings/page.tsx` |
| `/ferramentas/financeiro/invites/accept` | `ferramentas/financeiro/invites/accept/page.tsx` |
| `/produtos` | `produtos/page.tsx` |
| `/produtos/whatsapp-platform` | `produtos/whatsapp-platform/page.tsx` |
| `/produtos/investigamais` | `produtos/investigamais/page.tsx` |
| `/produtos/funklab-studio` | `produtos/funklab-studio/page.tsx` |
| `/login` | `login/page.tsx` |
| `/forgot-password` | `forgot-password/page.tsx` |
| `/reset-password` | `reset-password/page.tsx` |
| `/dashboard/whatsapp` | `dashboard/whatsapp/page.tsx` |
| `/dashboard/whatsapp/callback` | `dashboard/whatsapp/callback/page.tsx` |
| `/admin/metrics` | `admin/metrics/page.tsx` |
| `/automacao-whatsapp` | `automacao-whatsapp/page.tsx` |
| `/automacao-whatsapp-tabacaria` | `automacao-whatsapp-tabacaria/page.tsx` |
| `/automacao-whatsapp-restaurante` | `automacao-whatsapp-restaurante/page.tsx` |
| `/automacao-whatsapp-clinica` | `automacao-whatsapp-clinica/page.tsx` |
| `/automacao-whatsapp-loja` | `automacao-whatsapp-loja/page.tsx` |
| `/software-atendimento-whatsapp` | `software-atendimento-whatsapp/page.tsx` |
| `/chatbot-whatsapp` | `chatbot-whatsapp/page.tsx` |
| `/[slug]` (SEO dinâmico) | `(seo)/[slug]/page.tsx` |

### 1.2 APIs (`src/app/api`) — por família

| Prefixo / rota | Função (alto nível) |
|----------------|---------------------|
| `/api/health` | Saúde |
| `/api/me`, `/api/me/active-household` | Sessão / household ativo (Financeiro) |
| `/api/auth/login`, `logout`, `verify`, `signup`, `forgot-password`, `reset-password` | Auth **JWT WhatsApp** (não Supabase Financeiro) |
| `/api/billing/checkout`, `customer-portal`, `webhook` | Stripe / billing (contexto raiz) |
| `/api/expenses`, `/api/expenses/[expenseId]` | Despesas |
| `/api/incomes`, `/api/incomes/[incomeId]` | Receitas |
| `/api/rules`, `/api/rules/[ruleId]`, `/api/rules/allocations` | Regras |
| `/api/households`, `.../members`, `.../transfer-ownership` | Casas / membros |
| `/api/sources`, `/api/sources/[sourceId]` | Fontes |
| `/api/cycles`, `/api/cycles/[cycleId]` | Ciclos |
| `/api/payment-days`, `.../[paymentDayId]` | Dias de pagamento |
| `/api/invites`, `/api/invites/[inviteId]`, `/api/invites/accept` | Convites |
| `/api/personal-allocation-goals`, `.../[goalId]` | Metas PF |
| `/api/income-allocation-goals`, `.../[goalId]` | Metas por receita |
| `/api/dashboard/summary`, `cash-flow-projection` | Dashboard |
| `/api/financeiro/leads` | Leads Financeiro |
| `/api/financeiro/navigation/last-route` | Navegação |
| `/api/tools/cnpj/[cnpj]` | Ferramenta CNPJ |
| `/api/whatsapp/onboard`, `onboard/callback`, `phone-numbers` | Onboard WhatsApp (raiz) |
| `/api/webhook/whatsapp` | Webhook |
| `/api/admin/conversations`, `.../[id]`, `.../messages` | Admin conversas |
| `/api/admin/whatsapp/messages/*`, `onboarding/*` | Admin/onboarding WhatsApp |
| `/api/admin/metrics`, `revenue` | Admin métricas |
| `/api/analytics/growth` | Analytics |
| `/sitemap.xml`, `sitemap-*.xml` | Sitemaps |

---

## 2. App Financeiro (`apps/financeiro`)

Páginas **além** da raiz: rotas de **contas**, **importação**, **histórico**, **próximas contas**, etc. Não inclui `/ferramentas/financeiro/demo` neste pacote (demo fica na landing raiz).

| Rota | Nota |
|------|------|
| `/` | Home do app |
| `/upgrade` | Upgrade |
| `/billing` | Billing |
| `/ferramentas` | Hub ferramentas |
| `/ferramentas/divisao-de-contas` | Ferramenta |
| `/ferramentas/financeiro` | Landing Financeiro |
| `/ferramentas/financeiro/auth` | Login Supabase |
| `/ferramentas/financeiro/auth/callback` | OAuth callback |
| `/ferramentas/financeiro/onboarding` | Onboarding |
| `/ferramentas/financeiro/dashboard` | Dashboard |
| `/ferramentas/financeiro/expenses` | Despesas |
| `/ferramentas/financeiro/sources` | Fontes |
| `/ferramentas/financeiro/rules` | Regras |
| `/ferramentas/financeiro/settings` | Configurações |
| `/ferramentas/financeiro/importar` | Importar |
| `/ferramentas/financeiro/proximas-contas` | Próximas contas |
| `/ferramentas/financeiro/historico` | Histórico |
| `/ferramentas/financeiro/contas` | Lista de contas |
| `/ferramentas/financeiro/contas/[accountId]` | Detalhe conta |
| `/ferramentas/financeiro/invites/accept` | Aceitar convite |
| `/admin/metrics` | Métricas admin |

**APIs:** `apps/financeiro/src/app/api/*` — famílias `accounts`, `settlements`, `payments`, `expenses`, `incomes`, `import-csv`, `month-snapshots`, `recurrence`, `upcoming-expenses`, `health`, etc. (modelo de dados “contas / liquidações”).

---

## 3. WhatsApp Platform (`apps/whatsapp-platform`)

| Rota | Nota |
|------|------|
| `/` | Home / entrada do app |
| `/login` | Login tenant |
| `/signup` | Cadastro |
| `/onboarding` | Onboarding produto |
| `/conversations` | Conversas (visão tenant) |
| `/inbox` | Inbox (grupo `(protected)`) |
| `/automation` | Automação (grupo `(protected)`) |
| `/billing` | Billing (grupo `(protected)` + outras variantes) |
| `/dashboard` | Dashboard |
| `/dashboard/whatsapp` | Conectar WhatsApp |
| `/dashboard/whatsapp/callback` | Callback |
| `/dashboard/billing` | Billing no dashboard |
| `/settings` | Configurações |
| `/settings/billing` | Billing nas settings |
| `/settings/ai` | IA |
| `/settings/ai-analytics` | Analytics IA |
| `/agents` | Agentes |
| `/queues` | Filas |
| `/admin/login` | Login admin |
| `/admin/metrics` | Métricas |
| `/admin/billing` | Billing admin |
| `/admin/conversations` | Lista admin |
| `/admin/conversations/[id]` | Detalhe conversa |
| `/admin/agents` | Agentes admin |
| `/admin/distribuir` | Distribuição |

**APIs (resumo):** `auth`, `tenants/me`, `inbox/*`, `automation/rules`, `billing/*`, `stripe/*`, `webhooks/whatsapp`, `whatsapp/onboard`, `admin/*`, `agents`, `queues`, `realtime/stream`, `cron/*`, etc.

---

## 4. Investigamais (`apps/investigamais`)

| Rota |
|------|
| `/` |
| `/login` |
| `/dashboard` |
| `/dashboard/consulta` |
| `/dashboard/historico` |
| `/dashboard/perfil` |
| `/dashboard/assinatura` |
| `/admin/login` |
| `/admin/metrics` |

---

## 5. FunkLab (`apps/funklab`)

| Rota |
|------|
| `/` |

---

## 6. Ops (`apps/ops`)

| Rota | Nota |
|------|------|
| `/` | Dashboard cliente |
| `/api/health` | Health check |

---

## 7. Pacote Site (`apps/site`) — marketing parcial

Não inclui toda a superfície da raiz (ex.: não listamos aqui `/produtos` hub completo, `/como-funciona`, várias landing pages da raiz). Útil para saber que existe **cópia/variante** de marketing em pacote separado.

| Rota |
|------|
| `/` |
| `/ferramentas` |
| `/demo` |
| `/precos`, `/pricing` |
| `/contato`, `/sobre`, `/projetos` |
| `/blog`, `/blog/[slug]` |
| `/cookies`, `/termos`, `/privacidade` |
| `/produtos/whatsapp-platform`, `/produtos/funklab-studio` |
| Várias landings WhatsApp + `planilha-vs-app-financeiro`, `chatbot-whatsapp`, `software-atendimento-whatsapp` |

---

## 8. Fluxo real — como encaixar na cabeça

1. **Usuário marketing (público)**  
   Entra pela **landing raiz** (`src/app`): `/`, `/produtos`, `/ferramentas`, SEO `/[slug]`, campanhas `/automacao-whatsapp*`, etc.

2. **Usuário Financeiro**  
   - Na **raiz:** `/ferramentas/financeiro` → `auth` (Supabase) → onboarding/dashboard/expenses/…  
   - No **app `apps/financeiro`:** mesmo prefixo `/ferramentas/financeiro/*` **mais** telas `/ferramentas/financeiro/contas`, `importar`, `historico`, …  
   - **Demo pública** do Financeiro: só na raiz → `/ferramentas/financeiro/demo`.  
   - **Assinatura (Stripe) “global” na raiz:** `/billing` (cuidado para não confundir com billing do WhatsApp no outro app).

3. **Usuário WhatsApp Platform**  
   Fluxo completo no app **`apps/whatsapp-platform`**: `/login` → `/onboarding` → `/inbox`, `/settings`, billing, etc.  
   Na **raiz**, `/login` + `/api/auth/*` + `/dashboard/whatsapp` são **pedaços** do mesmo tipo de auth (JWT), quando esse app é servido junto ou para fluxos limitados — ver `docs/site/ROTAS-POR-APLICACAO.md`.

4. **Investigamais / FunkLab**  
   Apps dedicados; no marketing da **raiz** as landings `/produtos/investigamais` e `/produtos/funklab-studio` apontam narrativa; o app logado é outro deploy.

5. **`apps/site`**  
   Tratar como **segundo frontend de marketing** se estiver em uso; alinhar com o time qual é canônico em produção (raiz vs `apps/site`).

---

## 9. Manutenção

Ao criar `page.tsx` ou `route.ts` novo:

1. Adicione a rota na seção do app certo neste arquivo.  
2. Se cruzar auth (Supabase vs JWT vs público), atualize também `docs/site/ROTAS-POR-APLICACAO.md`.

---

*Gerado a partir da estrutura do repositório; rotas dinâmicas aparecem com `[param]`.*
