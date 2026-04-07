# Rotas por aplicação — o que é o quê

Este monorepo tem **vários produtos** e **dois “mundos” de auth** diferentes. Este doc evita misturar conceitos ao navegar código ou deploy.

## Resumo em uma tabela

| Superfície | Onde vive (código) | Auth principal | Rotas típicas |
|------------|-------------------|----------------|---------------|
| **Portal + Financeiro + APIs** | Raiz → `src/app`, `src/app/api` | Marketing: público. **Financeiro:** Supabase em `/ferramentas/financeiro/auth` | `/`, `/produtos`, `/ferramentas`, `/ferramentas/financeiro/*`, `/billing` (Financeiro), `/demo`; **308** para app WhatsApp nos paths operacionais quando `NEXT_PUBLIC_WHATSAPP_APP_URL` está definida |
| **WhatsApp Platform (app dedicado)** | `apps/whatsapp-platform/src/app` | **JWT** (`whatsapp_platform_token`, ver `JWT_SECRET`) | `/login`, `/signup`, `/inbox`, `/settings`, `/billing`, `/dashboard/*`, `/onboarding`, `/automation`, `/admin/*` |
| **Outros apps** | `apps/investigamais`, `apps/funklab`, `apps/ops`, … | Cada um com seu layout | Deploy/host próprios (não assumir mesmo domínio que o site) |

## 1. Site principal (`src/app`)

### Marketing (público)

- Home, produtos, ferramentas, preços, blog, páginas SEO, legal, contato.
- **Não** confundir com “app logado” do WhatsApp.

### Financeiro (produto)

- **Tudo sob** `/ferramentas/financeiro/...` (landing, demo, dashboard, despesas, regras, settings, onboarding, auth/callback).
- Auth: **Supabase** (sessão do Financeiro), não o formulário de `/login` do WhatsApp.

### Assinatura Financeiro (Stripe)

- **`/billing`** — gestão de plano do **Financeiro** (casas, regras, portal Stripe).
- É **independente** do billing do WhatsApp Platform no app `apps/whatsapp-platform`.

### WhatsApp — cutover portal → app

Com **`NEXT_PUBLIC_WHATSAPP_APP_URL`**, o **`middleware.ts` na raiz** responde **308** para o mesmo path no host do **`apps/whatsapp-platform`** (ex.: `/login`, `/inbox`, `/dashboard/whatsapp`). As páginas e APIs JWT/webhook do produto **não** ficam em `src/app` — só no app dedicado (porta **3000** em dev).

Landings de marketing WhatsApp (`/produtos/whatsapp-platform`, `/automacao-whatsapp*`, …) **continuam** na raiz. Ver [CUTOVER-WHATSAPP-RUNBOOK-MAIN.md](../architecture/CUTOVER-WHATSAPP-RUNBOOK-MAIN.md).

## 2. App WhatsApp Platform (`apps/whatsapp-platform`)

- App Next **separado** (`pnpm` / `next` no pacote `@devflow/app-whatsapp-platform`).
- Middleware próprio em `apps/whatsapp-platform/src/middleware.ts`.
- Rotas como **`/inbox`**, **`/settings`**, **`/billing`** (deste produto), **`/onboarding`**, **`/automation`** são **deste app**, não procure em `src/app` da raiz.

## 3. Regras para não se perder

1. **Financeiro** = prefixo **`/ferramentas/financeiro`** + Supabase.
2. **WhatsApp operacional completo** = pacote **`apps/whatsapp-platform`** (ou rotas JWT no host que você publicou para ele).
3. **`/billing` na raiz do repo (`src/app/billing`)** = **Financeiro**, não tratar como billing só do WhatsApp.
4. **`/login` na raiz** = login **JWT WhatsApp** (`/api/auth/*`), não é tela de entrada do Financeiro.
5. **Cookie** `whatsapp_platform_token` — compartilhado entre implementações que usam o mesmo `auth-config`; em **domínios diferentes** não há conflito; ao **unificar** host, planejar prefixo de path ou subdomínio.

## 4. Documentos relacionados

- **Lista completa de rotas/páginas por pacote:** `docs/site/INVENTARIO-ROTAS-MONOREPO.md`.
- **Matriz dono × status × ação (saneamento):** `docs/site/MATRIZ-DECISAO-ROTAS.md`.
- **Policy e execução em fases:** `docs/architecture/ROUTING_POLICY.md`, `docs/architecture/ROUTING_MIGRATION_EXECUCAO.md`.
- Navegação global do marketing: `docs/site/HEADER-E-NAVEGACAO.md`.
- Padrão de features Financeiro: `docs/financeiro/FINANCEIRO-FEATURE-STANDARD.md`.

---

*Ao adicionar rotas novas: indique neste arquivo em qual “superfície” ela entra e qual auth usa.*
