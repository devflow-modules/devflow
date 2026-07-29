# Header e navegação global (site marketing)

Referência da implementação **canónica**: `src/components/layout/header.tsx` e `src/components/layout/body-chrome.tsx`.

**Portal canónico:** `src/` na raiz do monorepo. O espelho em `apps/site` é **LEGACY** (não editar como fonte de verdade; decisão nav F6 / #173 opção A — ver `apps/site/README.md`).

**Rotas de qual app?** Marketing vs Financeiro vs WhatsApp Platform → ver **`docs/site/ROTAS-POR-APLICACAO.md`**.

O Header é **WhatsApp-first** e **não auth-aware** (sempre mostra «Entrar» para o app WhatsApp). Modelo «Acessar produtos» (WA vs Financeiro) está em VALIDATE em #174 — não implementar a partir desta doc.

---

## Onde o header entra no site

O layout global usa **`BodyChrome`** (`src/components/layout/body-chrome.tsx`), que envolve quase todas as páginas de marketing:

- **`Header`** (sticky no topo)
- **`main`** com o conteúdo da página
- **`Footer`**
- **`FloatingWhatsAppCta`**

### Excepção Financeiro (sem chrome marketing)

O portal **omite** Header / Footer / FloatingWhatsAppCta quando
`shouldOmitPortalMarketingChromeForFinanceiro(pathname)` é verdadeiro
(`@devflow/financeiro-routes`, pós-#170).

Em prática: qualquer path sob `/ferramentas/financeiro/*` **excepto**:

- landing `/ferramentas/financeiro`
- demo `/ferramentas/financeiro/demo` (+ subrotas)
- auth `/ferramentas/financeiro/auth` (+ callback / subrotas)

Nestas excepções o chrome marketing **permanece**. Nas restantes (dashboard, contas, expenses, regras, settings, onboarding, convites, histórico, importar, etc.) só `children` — o produto usa o **AppShell** próprio (tipicamente no host do app após cutover 308).

Continua **com** header do site: hub `/ferramentas`, `/produtos`, home, `/como-funciona`, `/contato`, etc.

---

## Estrutura do `Header` (desktop, ≥ `lg`)

Da esquerda para a direita:

1. **Marca**
   - Link “DevFlow Labs” → `/`
   - **Tagline** só a partir de **`xl`**: `WhatsApp Platform · IA no repetitivo · Handoff humano`

2. **Navegação central** (`aria-label="Navegação principal"`)
   - **WhatsApp Platform** → `/produtos/whatsapp-platform`
   - **Demo** → `/demo` (`PRIMARY_DEMO_HREF` em `src/lib/conversion-copy.ts`)
   - **Como funciona** → `/como-funciona`
   - **FAQ** → `/#faq` (sem estado «activo» visual)
   - **Ecossistema** — botão com dropdown (fecha com clique fora ou `Esc`). Secções:
     - *Ferramentas gratuitas:* `/ferramentas`, divisão de contas, consulta CNPJ
     - *Produtos complementares:* Sistema Financeiro (`FINANCEIRO_BASE_PATH`), catálogo `/produtos`
     - *Mais:* `/cases`, `/precos`
     - Primeira abertura na sessão dispara `header_products_opened` com `surface: header_desktop_ecosystem` (chave `header_ecosystem_opened_session`).

3. **Bloco de ações (direita)**
   - **Entrar** (visível ≥ `lg`) → `whatsappAppUrl("/login")` (app WhatsApp canónico, não `/login` do portal)
   - **Agendar diagnóstico** (`HEADER_CTA_LABEL` / `PRIMARY_CONVERT_CTA_LABEL`) → `/contato`
   - Hambúrguer só em `< lg`

Comportamento: **sticky**, sombra/blur após `scrollY > 8`.

---

## Mobile (`< lg`)

- O menu hambúrguer abre um **painel full-height** (`#mobile-nav`, `role="dialog"`) abaixo do header; `body` fica com `overflow: hidden` enquanto aberto.
- **Topo do painel** (ordem de conversão):
  1. Agendar diagnóstico → `/contato`
  2. Entrar → `whatsappAppUrl("/login")`
- Depois:
  - Secção **WhatsApp Platform:** WhatsApp Platform, Demo, Como funciona, FAQ
  - Secção **Ecossistema:** mesmos links do dropdown desktop (ferramentas + produtos + mais)

---

## Regras de “item ativo” (destaque visual)

Implementação: helpers em `header.tsx`.

| Item | Activo quando |
|------|----------------|
| **WhatsApp Platform** | path começa com `/produtos/whatsapp-platform` **ou** `/automacao-whatsapp` |
| **Demo** | path é `/demo` ou começa com `/demo/` |
| **Como funciona** | path é exactamente `/como-funciona` |
| **FAQ** | **nunca** (`navText(false)` fixo) |
| **Ecossistema** | ferramentas gratuitas (exceto prefixo Financeiro), `/produtos*`, `/cases`, `/precos`\|`/pricing`, **ou** qualquer path sob `FINANCEIRO_BASE_PATH` |

Em landing / demo / auth Financeiro o grupo **Ecossistema** fica activo (prefixo Financeiro); WhatsApp Platform / Demo / Como funciona tipicamente não.

---

## Analytics ligados ao header

- `header_nav_clicked` — itens de navegação (`whatsapp_platform`, `demo`, `como_funciona`, `faq`, links do ecossistema via `onNav`, `agendar_diagnostico`, `logo_home`, …) com `surface` desktop/mobile.
- `header_cta_clicked` — `entrar` e `agendar_diagnostico` (desktop/mobile).
- `funnel_cta_click` (via `trackFunnelCtaClick`) — `agendar_diagnostico` (`header_desktop` / `header_mobile`) e `ver_demo_guiada` (`header_nav_desktop` / `header_nav_mobile`).
- `header_products_opened` — primeira abertura do dropdown **Ecossistema** na sessão (desktop).
- `ecosystem_link_click` (via `trackEcosystemLinkClick`) — cada item do Ecossistema com `surface` `desktop_header` / `mobile_header`.

Eventos antigos da doc anterior (`header_demo_clicked`, `products_dropdown_item_clicked`, CTAs «Começar grátis» / «Ver exemplo») **não** descrevem o Header actual.

Na página **`/produtos`** podem existir eventos de página (`products_page_*`) fora do Header — ver implementação da página.

---

## Navegação “Como funciona”

- **`/como-funciona`** é uma página própria com breadcrumb curto e o mesmo bloco **`HowItWorksHub`** usado na home (inclui `id="como-funciona-hub"` para compatibilidade com links antigos `/#como-funciona-hub` na home).

---

**Resumo:** o header é a **espinha dorsal do marketing WhatsApp-first**; rotas internas do **Financeiro** (exceto landing/demo/auth) ficam **fora** desse chrome via `shouldOmitPortalMarketingChromeForFinanceiro` e usam o shell do produto.
