# Matriz de decisão — dono da rota, status e saneamento

Documento vivo: preencha a coluna **deploy real** quando fechar domínio/host em produção.  
Inventário detalhado: `INVENTARIO-ROTAS-MONOREPO.md`.  
Contexto de camadas (marketing / produto / operação): `ROTAS-POR-APLICACAO.md`.  
**Policy + fases de execução:** `docs/architecture/ROUTING_POLICY.md`, `docs/architecture/ROUTING_MIGRATION_EXECUCAO.md`.  
**Cutover Financeiro (épico):** `docs/architecture/EPICO-FINANCEIRO-CUTOVER.md`.

**Estado pós Bloco C/D (portal):** só aquisição em `/ferramentas/financeiro`; `/ferramentas/financeiro/demo` na raiz é **redirect** para o app (sem painel na raiz). Operação, auth, billing e upgrade na raiz redirecionam (308) ou server `redirect` para `NEXT_PUBLIC_FINANCEIRO_APP_URL` quando definido. Checkout Stripe chama a API no host do app.

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
| `/login`, `/forgot-password`, `/reset-password` (JWT) | `apps/whatsapp-platform` **no host do produto** | Raiz + `whatsapp-platform` + `investigamais` | ok entre domínios | **manter** em cada app no **seu** deploy; na raiz **migrar** ou **redirecionar** se raiz não servir mais WhatsApp |
| `/dashboard/whatsapp`, `/dashboard/whatsapp/callback` | `apps/whatsapp-platform` | Raiz + `apps/whatsapp-platform` | duplicada / ambígua | **migrar** para `apps/whatsapp-platform`; raiz **redirecionar** ou **remover** |
| `/admin/metrics` (contexto misto) | Definir (WhatsApp vs portal) | Raiz | ambígua | **migrar** para app dono do dado ou proteger por produto; evitar “admin genérico” na raiz |
| `/projetos` | Raiz | Raiz | ok | **manter** |
| Páginas só em `apps/site` | — | `apps/site` | legado | **depreciar** → **remover** após fusão na raiz |

---

## 4. Matriz — APIs (famílias)

| Prefixo / família | App dono (alvo) | Hoje | Status | Ação |
|-------------------|-----------------|------|--------|------|
| `/api/auth/*` (JWT WhatsApp) | `apps/whatsapp-platform` | Raiz | ambígua | **migrar** para host do WhatsApp se raiz não for borda única |
| `/api/whatsapp/*`, `/api/webhook/whatsapp` | `apps/whatsapp-platform` | Raiz | ambígua | **migrar** com produto WhatsApp |
| `/api/me`, `/api/households`, `/api/expenses`, … (dados Financeiro) | `apps/financeiro` | Raiz | ok | **Bloco D:** removidos da raiz — só em `apps/financeiro` |
| `/api/billing/checkout`, `customer-portal` | `apps/financeiro` | Raiz | ok | **Bloco D:** removidos da raiz; CTAs do portal chamam API no host do app |
| `/api/billing/webhook` (Stripe) | `apps/financeiro` | Só app | ok | Stripe aponta ao host do app; raiz **não** expõe webhook |
| `/api/financeiro/*` (leads, navigation) | Raiz (portal) ou `apps/financeiro` | Raiz | ambígua | **manter** leads no portal se forem marketing; dados de app **migrar** |
| `/api/tools/cnpj/*` | Raiz | Raiz | ok | **manter** (ferramenta pública) |
| `/api/admin/conversations`, `/api/admin/whatsapp/*` | `apps/whatsapp-platform` | Raiz | ambígua | **migrar** |
| `/api/admin/metrics`, `revenue` | Definir por produto | Raiz | ambígua | **migrar** para app dono |
| `/api/health` | Cada app | Vários | ok | **manter** em cada deploy |
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
| `apps/site` | Marketing espelho | duplicado com raiz | **depreciar** → **remover** ou fundir |

---

## 6. Ordem sugerida de saneamento (para não travar o time)

1. **Congelar** novas features em `apps/site` e decidir data de desligamento ou redirect total para raiz.  
2. **Congelar** novas telas operacionais de Financeiro na raiz; novas só em `apps/financeiro`.  
3. **Cutover Financeiro:** redirects 301 de `/ferramentas/financeiro/auth|onboarding|dashboard|…` da raiz → URL canônica do app (mesmo path em outro host, ou path unificado).  
4. **Cutover billing:** `/billing` e `/upgrade` no app Financeiro; raiz com link/redirect.  
5. **WhatsApp na raiz:** remover ou redirecionar `/dashboard/whatsapp*` e avaliar `/api/auth` + webhooks na raiz após tráfego zero.  
6. **APIs:** mover junto com o cutover de cada produto (não antes de UI estável).

---

## 7. Risco principal (gestão)

Sem esta matriz atualizada no PR de cada mudança, o risco continua **organizacional**: feature nova cai na raiz “porque é mais rápido”.  
**Gate sugerido:** checklist “dono = raiz | financeiro | whatsapp | investigamais | outro” no PR template.

---

*Última atualização: alinhada ao inventário do monorepo e à opção “raiz = portal canônico + apps = produtos”.*
