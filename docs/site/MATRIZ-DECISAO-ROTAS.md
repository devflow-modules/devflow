# Matriz de decisão — dono da rota, status e saneamento

Documento vivo: preencha a coluna **deploy real** quando fechar domínio/host em produção.  
Inventário detalhado: `INVENTARIO-ROTAS-MONOREPO.md`.  
Contexto de camadas (marketing / produto / operação): `ROTAS-POR-APLICACAO.md`.  
**Policy + fases de execução:** `docs/architecture/ROUTING_POLICY.md`, `docs/architecture/ROUTING_MIGRATION_EXECUCAO.md`.  
**Cutover Financeiro (épico):** `docs/architecture/EPICO-FINANCEIRO-CUTOVER.md`.

**Estado pós Bloco C/D (portal):** só aquisição em `/ferramentas/financeiro`; `/ferramentas/financeiro/demo` na raiz é **redirect** para o app (sem painel na raiz). Operação, auth, billing e upgrade na raiz redirecionam (308) ou server `redirect` para `NEXT_PUBLIC_FINANCEIRO_APP_URL` quando definido. Checkout Stripe chama a API no host do app.

**WhatsApp Platform:** com `NEXT_PUBLIC_WHATSAPP_APP_URL` definido, UI operacional (`/inbox`, `/settings`, `/dashboard/whatsapp`, `/dashboard/billing`, `/onboarding`, `/automation`), auth (`/login`, `/signup`, `/forgot-password`, `/reset-password`) recebe **308** para o mesmo path no app — ver `@devflow/whatsapp-routes` e `docs/architecture/CUTOVER-WHATSAPP-RUNBOOK-MAIN.md`. Landings WhatsApp na raiz **não** redirecionam. `/admin/metrics` na raiz continua sendo painel interno portal (não é o admin do produto WhatsApp).

---

## 1. Canon proposto (source of truth)

Decisão **pragmática** alinhada ao diagnóstico de sobreposição raiz ↔ apps:

| Domínio | App canônico (código) | Observação |
|---------|------------------------|------------|
| Portal DevFlow Labs (marketing, SEO, hub de produtos, demos **públicas**, legal) | **`src/app` (raiz)** | Site oficial canônico |
| Produto **Financeiro** (app autenticado completo, billing do produto, APIs de dados) | **`apps/financeiro`** | Única fonte de verdade operacional |
| Produto **WhatsApp Platform** | **`apps/whatsapp-platform`** | Já bem isolado |
| Produto **Investigamais** | **`apps/investigamais`** | App dedicado |
| **FunkLab** (landing mínima + produto conforme evolução) | **`apps/funklab`** + landings na raiz | Landings de narrativa na raiz; app no pacote |
| Pacote **`apps/site`** | **Não canônico** | **Depreciar** ou fundir na raiz; não criar features novas aqui |

**Regra de ouro:** uma rota **pública de aquisição** existe em **um** lugar; um fluxo **autenticado de produto** pertence a **um** app. A raiz deixa de competir com `apps/financeiro` assim que a migração for concluída.

---

## 2. Legenda

### Status (situação hoje no código)

| Status | Significado |
|--------|-------------|
| **ok** | Um dono claro; sem duplicata relevante no monorepo |
| **duplicada** | Mesmo path ou responsabilidade em mais de um app |
| **ambígua** | Dono depende de deploy/domínio ou há sobreposição marketing × operação |
| **legado** | Ainda usada, mas fora do alvo arquitetural |
| **só raiz** | Existe apenas na raiz (candidata a migrar ou manter como portal) |

### Ação (plano)

| Ação | Significado |
|------|-------------|
| **manter** | Canon atual; seguir evoluindo aqui |
| **migrar** | Mover implementação para o app dono; depois redirecionar ou remover da origem |
| **redirecionar** | Manter URL estável apontando para o app canônico (301/rewrite) |
| **depreciar** | Congelar; não adicionar features; remover após janela |
| **remover** | Apagar rota após migração e comunicação |

---

## 3. Matriz — páginas e prefixos UI

| Rota / prefixo | App dono (alvo) | Hoje no código | Status | Ação |
|----------------|-----------------|----------------|--------|------|
| `/`, `/como-funciona`, `/contato`, `/sobre`, `/projetos` | Raiz | Raiz (+ parcial em `apps/site`) | duplicada | **manter** (raiz); **depreciar** `apps/site` |
| `/precos`, `/pricing` | Raiz | Raiz (+ `apps/site`) | duplicada | **manter** (raiz); **depreciar** `apps/site` |
| `/produtos`, `/produtos/*` | Raiz | Raiz | ok | **manter** |
| `/blog`, `/blog/[slug]` | Raiz | Raiz (+ `apps/site`) | duplicada | **manter** (raiz); **depreciar** `apps/site` |
| `/demo` | Raiz | Raiz (+ `apps/site`) | duplicada | **manter** (raiz); **depreciar** `apps/site` |
| `/cookies`, `/termos`, `/privacidade` | Raiz | Raiz (+ `apps/site`) | duplicada | **manter** (raiz); **depreciar** `apps/site` |
| `/ferramentas` (hub) | Raiz | Raiz (+ `apps/financeiro`, `apps/site`) | duplicada | **manter** (raiz); **redirecionar** ou **remover** hub duplicado nos apps |
| `/ferramentas/divisao-de-contas`, `/ferramentas/consulta-cnpj` | Raiz | Raiz (+ `apps/financeiro` divisão) | duplicada | **manter** (raiz) para tools públicas; **migrar** cópia do app financeiro para consumir mesma origem ou **remover** duplicata |
| `/ferramentas/financeiro` (landing pública) | Raiz | Raiz + `apps/financeiro` | duplicada | **manter** (raiz) como **só marketing**; **redirecionar** “entrar no app” para host do `apps/financeiro` quando separado |
| `/ferramentas/financeiro/demo` | Raiz (URL estável) → app | Só raiz (redirect) | ok | **manter** URL de aquisição; **redirect** para demo canónica no `apps/financeiro` |
| `/ferramentas/financeiro/auth`, `auth/callback` | `apps/financeiro` | Só `apps/financeiro` | ok | **Bloco C:** raiz sem páginas; **308** para `NEXT_PUBLIC_FINANCEIRO_APP_URL` (middleware) |
| `/ferramentas/financeiro/onboarding` … `settings`, `dashboard`, `expenses`, `sources`, `rules` | `apps/financeiro` | Só `apps/financeiro` | ok | **Bloco C:** raiz sem páginas; redirect canónico no middleware |
| `/ferramentas/financeiro/*` (contas, importar, histórico, proximas-contas) | `apps/financeiro` | Só `apps/financeiro` | ok | **manter** (app); raiz **308** para o mesmo path no host do app |
| `/ferramentas/financeiro/invites/accept` | `apps/financeiro` | Só `apps/financeiro` | ok | **Bloco C:** raiz sem página; **308** para app canónico |
| `/billing` (Stripe planos Financeiro) | `apps/financeiro` | Raiz | ambígua | **migrar** para `apps/financeiro`; raiz **redirecionar** ou link “gerenciar assinatura” |
| `/upgrade` | `apps/financeiro` | Raiz | ambígua | **migrar** com billing |
| Landings `/automacao-whatsapp*`, `/chatbot-whatsapp`, `/software-atendimento-whatsapp` | Raiz | Raiz (+ parte em `apps/site`) | duplicada | **manter** (raiz); **depreciar** `apps/site` |
| `(seo)/[slug]` | Raiz | Raiz | ok | **manter** |
| `/login`, `/forgot-password`, `/reset-password` (JWT) | `apps/whatsapp-platform` **no host do produto** | Raiz + `whatsapp-platform` + `investigamais` | duplicada | **308** para app quando `NEXT_PUBLIC_WHATSAPP_APP_URL`; canónico no app após cutover |
| `/dashboard/whatsapp`, `/dashboard/whatsapp/callback` | `apps/whatsapp-platform` | Raiz + `apps/whatsapp-platform` | duplicada | **308** / remoção na raiz após cutover |
| `/admin/metrics` (contexto misto) | Definir (WhatsApp vs portal) | Raiz | ambígua | **migrar** para app dono do dado ou proteger por produto; evitar “admin genérico” na raiz |
| `/projetos` | Raiz | Raiz | ok | **manter** |
| Páginas só em `apps/site` | — | `apps/site` | legado | **depreciar** → **remover** após fusão na raiz |

---

## 4. Matriz — APIs (famílias)

| Prefixo / família | App dono (alvo) | Hoje | Status | Ação |
|-------------------|-----------------|------|--------|------|
| `/api/auth/*` (JWT WhatsApp) | `apps/whatsapp-platform` | Removido da raiz | ok | **manter** só no app |
| `/api/whatsapp/*`, `/api/webhook/whatsapp` | `apps/whatsapp-platform` | Removido da raiz | ok | **manter** só no app |
| `/api/me`, `/api/households`, `/api/expenses`, … (dados Financeiro) | `apps/financeiro` | Raiz | ok | **Bloco D:** removidos da raiz — só em `apps/financeiro` |
| `/api/billing/checkout`, `customer-portal` | `apps/financeiro` | Raiz | ok | **Bloco D:** removidos da raiz; CTAs do portal chamam API no host do app |
| `/api/billing/webhook` (Stripe) | `apps/financeiro` | Só app | ok | Stripe aponta ao host do app; raiz **não** expõe webhook |
| `/api/financeiro/*` (leads, navigation) | Raiz (portal) ou `apps/financeiro` | Raiz | ambígua | **manter** leads no portal se forem marketing; dados de app **migrar** |
| `/api/tools/cnpj/*` | Raiz | Raiz | ok | **manter** (ferramenta pública) |
| `/api/admin/conversations`, `/api/admin/whatsapp/*` | `apps/whatsapp-platform` | Removido da raiz | ok | **manter** só no app |
| `/api/admin/metrics`, `revenue` | Definir por produto | Raiz | ambígua | **migrar** para app dono |
| `/api/health` | Cada app | Vários | ok | **manter** em cada deploy |
| `/provider-runtime/nango/connect` (GET, host ApplyFlow) | `apps/applyflow` | Só app | ok | **manter** — launcher server-side Nango Connect session readiness; client-safe JSON + short-lived connect session token when allowed; requires feature flags + explicit consent (`explicit_consent=1`); no Gmail/Calendar import; no sync job; no raw payload persistence; no OAuth token exposure; no CareerBundle mutation |
| `/provider-runtime/nango/connection-status` (POST, host ApplyFlow) | `apps/applyflow` | Só app | ok | **manter** — server-side Nango connection verification boundary; client-safe JSON snapshot only; requires feature flags + explicit consent; uses `listConnections` without credentials; no Gmail/Calendar import; no sync job; no raw payload persistence; no OAuth token exposure; no CareerBundle mutation |
| `/provider-runtime/nango/derived-preview` (POST, host ApplyFlow) | `apps/applyflow` | Só app | ok | **manter** — server-side opt-in read-only preview of provider-derived runtime signals; client-safe `ProviderDerivedRuntimeCompositionResult` only; requires feature flags + explicit consent; independently verifies Gmail and Calendar Nango connections server-side (client connection state never trusted); ephemeral metadata processing; no persistence; no OAuth token exposure; no CareerBundle mutation |
| `/career-agents/orchestrate` (POST, host ApplyFlow) | `apps/applyflow` | Só app | ok | **manter** — server-side deterministic career agent orchestration; client-safe `CareerAgentResult` only; requires explicit consent; policy engine + intent routing; pure simulated execution (no LLM, no provider calls); allowlisted capabilities; mandatory human review; no CareerBundle/application mutation; `GET` → 405 |
| `/career-tools/invoke` (POST, host ApplyFlow) | `apps/applyflow` | Só app | ok | **manter** — server-side MCP-compatible tool invoke boundary; client-safe `CareerToolExecutionResult` only; reconstructs execution plan from orchestration context; permission engine + explicit export approval; local pure execution only; no external execution; no persistence; `GET` → 405 |
| `/career-chat/librechat` (POST, host ApplyFlow) | `apps/applyflow` | Só app | ok | **manter** — server-side LibreChat-compatible chat adapter; client-safe `CareerChatResponse` only; deterministic intent from `action`; orchestrator server-side; tool proposals without execution; explicit consent; feature flag `LIBRECHAT_ADAPTER_ENABLED`; no LLM/provider calls; no conversation persistence; `GET` → 405 |
| `/career-llm/generate` (POST, host ApplyFlow) | `apps/applyflow` | Só app | ok | **manter** — server-side controlled LLM generation boundary; client-safe `CareerLlmResult` only; feature-flagged (`CAREER_LLM_ENABLED` default off, `CAREER_LLM_PROVIDER=mock\|openai`); explicit consent; structured output validated against schema + limits; reconstructs chat → orchestration → task → policy → provider server-side; LLM never selects intent/agent/task/provider/tools and never executes tools; **no tool execution** (no `/career-tools/invoke`); secrets server-side only; no persistence; mandatory human review; `GET` → 405 |
| `/career-automation/execute` (POST, host ApplyFlow) | `apps/applyflow` | Só app | ok | **manter** — server-side approved automation execution boundary; client-safe `CareerAutomationExecutionResult` only; feature-flagged (`CAREER_AUTOMATION_ENABLED` default off, `CAREER_AUTOMATION_PROVIDER=mock\|openclaw`); explicit, request-scoped approval; single execution; reconstructs execution plan → proposal → tool definition → capability → approval → policy → tool invocation server-side; server-authoritative kind→tool allowlist; **no schedule / no background / no persistence**; reuses pure tool engine server-side; secrets server-side only; mandatory human review; `GET` → 405 |
| Sitemaps | Raiz | Raiz | ok | **manter** |

---

## 5. Apps dedicados (fora da raiz)

| App | Papel | Status vs alvo | Ação |
|-----|--------|----------------|------|
| `apps/whatsapp-platform` | Produto WhatsApp | ok | **manter**; referência de fronteira |
| `apps/financeiro` | Produto Financeiro canônico | duplicado com raiz nas rotas compartilhadas | **manter** e **absorver** tráfego operacional da raiz |
| `apps/investigamais` | Produto Investigamais | ok | **manter** |
| `apps/funklab` | FunkLab | ok | **manter** |
| `apps/ops` | Interno | ok | **manter** |
| `apps/applyflow` | ApplyFlow (Career Suite) | ok | **manter**; rotas server-side de provider runtime só no app |
| `apps/site` | Marketing espelho | duplicado com raiz | **depreciar** → **remover** ou fundir |

---

## 6. Ordem sugerida de saneamento (para não travar o time)

1. **Congelar** novas features em `apps/site` e decidir data de desligamento ou redirect total para raiz.  
2. **Congelar** novas telas operacionais de Financeiro na raiz; novas só em `apps/financeiro`.  
3. **Cutover Financeiro:** redirects 301 de `/ferramentas/financeiro/auth|onboarding|dashboard|…` da raiz → URL canônica do app (mesmo path em outro host, ou path unificado).  
4. **Cutover billing:** `/billing` e `/upgrade` no app Financeiro; raiz com link/redirect.  
5. **WhatsApp:** cutover **308** + remoção de APIs/UI na raiz — **feito**; manter env e middleware alinhados ao host canónico.  
6. **APIs:** mover junto com o cutover de cada produto (não antes de UI estável).

---

## 7. Risco principal (gestão)

Sem esta matriz atualizada no PR de cada mudança, o risco continua **organizacional**: feature nova cai na raiz “porque é mais rápido”.  
**Gate sugerido:** checklist “dono = raiz | financeiro | whatsapp | investigamais | outro” no PR template.

---

*Última atualização: cutover WhatsApp (308 + raiz sem runtime WA); raiz = portal + Financeiro; apps = produtos canónicos.*
