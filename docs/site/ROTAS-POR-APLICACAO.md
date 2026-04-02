# Rotas por aplicação — o que é o quê

Este monorepo tem **vários produtos** e **dois “mundos” de auth** diferentes. Este doc evita misturar conceitos ao navegar código ou deploy.

## Resumo em uma tabela

| Superfície | Onde vive (código) | Auth principal | Rotas típicas |
|------------|-------------------|----------------|---------------|
| **Site + Financeiro + APIs** | Raiz do repo → `src/app`, `src/app/api` | Marketing: público. **Financeiro:** Supabase em `/ferramentas/financeiro/auth` | `/`, `/produtos`, `/ferramentas`, `/ferramentas/financeiro/*`, `/billing` (assinatura Financeiro), `/demo`, `/como-funciona` |
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

### WhatsApp no mesmo deploy (legado / híbrido)

Algumas rotas existem **neste** `src/app` para fluxo WhatsApp com **mesmo cookie JWT** que o app dedicado:

- **`/login`**, `forgot-password`, `reset-password` → `POST /api/auth/login` etc.
- **`/dashboard/whatsapp`** → conectar número (área operacional leve).
- O **`middleware.ts` na raiz** protege um conjunto de paths com JWT **pensado no produto WhatsApp**; na prática **vários desses paths não têm páginas em `src/app`** — as telas completas (inbox, automação, onboarding WhatsApp) estão no app **`apps/whatsapp-platform`**.

Ou seja: em desenvolvimento você acessa o produto WhatsApp em **`apps/whatsapp-platform` (ex.: porta 3004)**; no site raiz ficam marketing + Financeiro + pedaços do fluxo WhatsApp quando o deploy unifica domínio.

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
