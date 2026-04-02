# Header e navegação global (site marketing)

Referência da implementação atual: `BodyChrome`, `Header` e exceções do Financeiro.

**Rotas de qual app?** Marketing vs Financeiro vs WhatsApp Platform → ver **`docs/site/ROTAS-POR-APLICACAO.md`**.

## Onde o header entra no site

O layout global usa **`BodyChrome`** (`src/components/layout/body-chrome.tsx`), que envolve quase todas as páginas de marketing:

- **`Header`** (sticky no topo)
- **`main`** com o conteúdo da página
- **`Footer`**
- **`FloatingWhatsAppCta`**

**Exceção importante:** nas rotas **do app autenticado do Financeiro** (dashboard, despesas, regras, settings, onboarding, convites etc.), o `BodyChrome` **não** renderiza header/footer — só o `children`. Assim o Financeiro usa o **AppShell** próprio, sem o header do site.

Continua **com** header do site: landing `/ferramentas/financeiro`, `/ferramentas/financeiro/demo`, `/ferramentas/financeiro/auth`, hub `/ferramentas`, `/produtos`, home, `/como-funciona`, etc.

---

## Estrutura do `Header` (desktop, ≥ `lg`)

Da esquerda para a direita:

1. **Marca**  
   - Link “DevFlow Labs” → `/`  
   - **Tagline** só a partir de **`xl`**: texto curto sobre ferramentas gratuitas / SaaS / automação (para não competir com o menu em larguras médias).

2. **Navegação central** (`<nav>`)  
   - **Nossos produtos** — botão com **dropdown tipo catálogo**: cada item com descrição curta + CTA **Abrir**; Financeiro em destaque com badge **Mais usado**; link **Ver catálogo completo** → `/produtos`. Fecha com clique fora ou `Esc`. Primeira abertura na sessão dispara `header_products_opened`. Clique em **Abrir** dispara `products_dropdown_item_clicked`.  
   - **Ferramentas gratuitas** → `/ferramentas`  
   - **Como funciona** → **`/como-funciona`** (página dedicada)  
   - **Preços** → `/precos`

3. **Bloco de ações (direita)**  
   - **Ver exemplo** → demo pública do Financeiro (`FINANCEIRO_DEMO_PATH`), estilo destacado (borda/fundo primary).  
   - **Entrar** → `/login`  
   - **Começar grátis** → landing do Financeiro (`FINANCEIRO_BASE_PATH`), label em `conversion-copy` (“Começar grátis”).

Comportamento: **sticky**, sombra/blur após um pouco de scroll.

---

## Mobile (`< lg`)

- O menu hambúrguer abre um **painel full-height** abaixo do header.  
- No **topo do painel** (ordem de conversão):  
  1. Começar grátis  
  2. Ver exemplo (destaque)  
  3. Entrar  
- Depois: lista **Produtos** (os mesmos quatro links) e links **Ferramentas gratuitas**, **Como funciona**, **Preços** (sem repetir “Ver exemplo” no fim da lista).

---

## Regras de “item ativo” (destaque visual)

- **Nossos produtos:** ativo só em URLs que começam com **`/produtos`**.  
  - **Não** marca ativo em `/ferramentas/financeiro/...` (o CTA carrega o Financeiro).

- **Ferramentas gratuitas:** ativo em `/ferramentas` e em **`/ferramentas/...` que não seja** o prefixo do app Financeiro (`FINANCEIRO_BASE_PATH`).

- **Como funciona:** ativo em **`/como-funciona`**.

- **Preços:** ativo em `/precos` ou `/pricing`.

- **Ver exemplo:** estado visual ativo na demo (`FINANCEIRO_DEMO_PATH` e subrotas, se houver).

Em **`/ferramentas/financeiro`** (landing), **demo**, **auth**, etc.: normalmente **nenhum** link do meio fica “ativo”; o foco fica nos CTAs da direita.

---

## Analytics ligados ao header

- `header_nav_clicked` — itens de navegação (incl. `ver_exemplo` com `surface` desktop/mobile).  
- `header_cta_clicked` — `começar_grátis` e `entrar`.  
- `header_demo_clicked` — clique na demo (`surface` distingue desktop CTA vs mobile).  
- `header_products_opened` — primeira abertura do dropdown na sessão (desktop).  
- `products_dropdown_item_clicked` — `product_id`, `target_href`, `surface` (desktop/mobile).  
- Na página **`/produtos`**: `products_page_card_clicked`, `products_page_cta_clicked`, `products_selection_help_used` (seção “Como escolher”, ao entrar no viewport).

---

## Navegação “Como funciona”

- **`/como-funciona`** é uma página própria com breadcrumb curto e o mesmo bloco **`HowItWorksHub`** usado na home (inclui `id="como-funciona-hub"` para compatibilidade com links antigos `/#como-funciona-hub` na home).

---

**Resumo:** o header é a **espinha dorsal do marketing**; o **app Financeiro logado** fica **fora** desse chrome e usa só o shell do produto.
