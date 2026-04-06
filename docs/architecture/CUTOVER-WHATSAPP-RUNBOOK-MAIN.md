# Runbook — Cutover WhatsApp Platform (portal × `apps/whatsapp-platform`)

**Objetivo:** mesmo padrão do Financeiro: operação, auth JWT, webhook e APIs do produto WhatsApp no **host canônico** (`NEXT_PUBLIC_WHATSAPP_APP_URL`); portal = marketing + redirects **308** quando a env estiver definida.

**Relacionados:** [CUTOVER-FINANCEIRO-RUNBOOK-MAIN.md](./CUTOVER-FINANCEIRO-RUNBOOK-MAIN.md) (estrutura de blocos), [WHATSAPP_PORTAL_APP_PARITY.md](./WHATSAPP_PORTAL_APP_PARITY.md), [WHATSAPP-CUTOVER-HOMOLOGACAO.md](./WHATSAPP-CUTOVER-HOMOLOGACAO.md) (script + checklist + CI), [WHATSAPP-SPRINT-FINAL-HOMOLOGACAO-SIGNOFF.md](./WHATSAPP-SPRINT-FINAL-HOMOLOGACAO-SIGNOFF.md) (sprint final, DoD, sign-off), [PLANO_TRANSICAO_APP_SUBDOMINIO.md](../../apps/whatsapp-platform/docs/PLANO_TRANSICAO_APP_SUBDOMINIO.md), [DEPLOY_APP_SUBDOMAIN.md](../../apps/whatsapp-platform/docs/DEPLOY_APP_SUBDOMAIN.md).

**Pacote:** `@devflow/whatsapp-routes` — `getWhatsappCutoverRedirectUrl`, listas de prefixos JWT vs cutover.

---

## Status: código vs produção

| Dimensão | Estado |
|----------|--------|
| **Código / arquitetura** | Cutover na `main`: portal = marketing + **308**; runtime WhatsApp só em `apps/whatsapp-platform`; `@devflow/whatsapp-routes`; middleware lê `NEXT_PUBLIC_WHATSAPP_APP_URL` e passa base ao cutover (Edge). |
| **Produção (portal)** | Com `NEXT_PUBLIC_WHATSAPP_APP_URL` e deploy alinhado, redirects **308** para o host do app; smoke **`scripts/ops/validate-whatsapp-cutover.sh`** e CI **Validate WhatsApp cutover** validam o comportamento. |
| **Operação contínua** | Checklist §5 (Meta callback, OAuth URIs, smoke E2E mensagem real, sign-off) — revisar após mudanças de domínio ou env. |

---

## 5. Checklist final de go-live (operacional)

Marcar na ordem após cada deploy/alteração de config.

- [ ] `NEXT_PUBLIC_WHATSAPP_APP_URL` configurada no **portal** (produção), apontando para o URL público final do app.
- [ ] `apps/whatsapp-platform` publicado no **domínio/subdomínio final** (Vercel ou equivalente).
- [ ] Webhook Meta: **Callback URL** = `https://<host-canônico>/api/webhook/whatsapp` (GET challenge OK antes de salvar).
- [ ] OAuth / Embedded Signup: redirect URIs alinhados ao host canônico (`DEPLOY_APP_SUBDOMAIN.md`).
- [ ] Cookies / auth **cross-domain** validados no browser real (login, `next` após redirect, sessão no app).
- [ ] Login com redirect correto; **forgot / reset password** (e-mail Resend) em produção.
- [ ] **Signup** e fluxo pós-signup (onboarding / Stripe se aplicável).
- [ ] **Billing / checkout / portal** Stripe no host do app, se usado.
- [ ] No portal: rotas operacionais WhatsApp respondem **308** para o app quando a env está ativa (amostra: `/login`, `/dashboard/whatsapp`).
- [ ] **Smoke test** pós-deploy ponta a ponta (mensagem inbound → fila/resposta conforme produto).
- [ ] **Plano de rollback** revisado (Meta: URL anterior; portal: remover ou corrigir `NEXT_PUBLIC_WHATSAPP_APP_URL`).

### Após go-live verde

- [ ] Tag de release sugerida: `whatsapp-platform-go-live-YYYY-MM-DD` (ou nome acordado pelo time).
- [ ] Registrar data/responsável neste doc ou wiki interno.

---

## 0. Antes de qualquer bloco

| # | Ação | Feito |
|---|------|-------|
| 0.1 | Tag `pre-whatsapp-cutover-YYYY-MM-DD` na `main` | ☐ |
| 0.2 | Snapshot de rotas WhatsApp (portal + app) | ☐ |
| 0.3 | Snapshot de envs (Vercel) — nomes apenas | ☐ |
| 0.4 | `WHATSAPP_DATABASE_URL` + migrations no app | ☐ |
| 0.5 | `whatsapp-platform` deployável; GET webhook challenge OK no host canônico | ☐ |

---

## 1. Blocos (ordem)

| Bloco | Conteúdo |
|-------|-----------|
| **A** | Pacote `whatsapp-routes`, docs, paridade, `.env.example` |
| **B** | Middleware: `getWhatsappCutoverRedirectUrl` → **308** (após Financeiro, antes do JWT WhatsApp) |
| **C** | Auth completo no app (verify, forgot, reset, rate limit signup); links `NEXT_PUBLIC_WHATSAPP_APP_URL`; **Meta**: OAuth URIs no app; depois **troca Callback URL** do webhook (não usar redirect HTTP para POST) |
| **D** | Remover da raiz APIs/páginas/módulos duplicados; `prisma/whatsapp.schema` + generate no root; limpar `tsconfig` paths `@wa` / reexports |

**Gate após cada bloco:** smoke (login, inbox ou dashboard, webhook teste na Meta após C).

---

## 2. Ordem crítica — Meta

1. Deploy `apps/whatsapp-platform` com `WHATSAPP_VERIFY_TOKEN` e `/api/webhook/whatsapp` respondendo ao GET (challenge).
2. OAuth / Embedded Signup: redirect URIs apontando para o **host canônico** (ver `DEPLOY_APP_SUBDOMAIN.md`).
3. Só então: WhatsApp → Configuration → Webhook → Callback URL = `https://<host>/api/webhook/whatsapp`.

Rollback: voltar Callback URL para a URL anterior na Meta.

---

## 3. O que **não** entra no cutover 308

- Landings/SEO: `/produtos/whatsapp-platform`, `/automacao-whatsapp*`, `/software-atendimento-whatsapp*`, `/chatbot-whatsapp*`.
- `/admin/metrics` na **raiz** (métricas internas portal — **não** confundir com `/admin/metrics` do app WhatsApp).

---

## 4. Checklist rápido

| # | Ação | Status |
|---|------|--------|
| A.1 | `@devflow/whatsapp-routes` no portal; build OK | ☐ |
| B.1 | Com env: `/login`, `/inbox`, `/dashboard/whatsapp` → app; landings não redirecionam | ☐ |
| C.1 | Forgot/reset/verify no app; header “Entrar” usa URL pública do app quando env setada | ☐ |
| C.2 | Meta webhook verde no host canônico | ☐ |
| D.1 | Raiz sem schema WhatsApp Prisma; sem rotas `/api/webhook/whatsapp` duplicadas | ☐ |
