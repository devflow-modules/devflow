# QA Visual — Contraste, Legibilidade e Hierarquia

Escopo: `/`, `/ferramentas`, `/privacidade`, `/termos`, `/cookies`, `header`, `footer`, cards reutilizáveis.

Objetivo: garantir leitura confortável em uso real, sem zoom, mantendo identidade dark premium.

## Preparação

- Ambiente local com build atual.
- Testar com tema padrão do portal.
- Navegadores: Chrome (obrigatório) e Safari/Firefox (recomendado).
- Breakpoints:
  - Mobile: `375x812`
  - Tablet: `768x1024`
  - Desktop: `1280x800` (ou maior)

## Regras de Aprovação

- Nenhum texto informativo relevante pode estar “apagado”.
- Links e CTAs devem ter estados claros de `hover` e `focus`.
- Texto auxiliar deve ser secundário, mas legível.
- Em páginas legais, leitura longa deve ser confortável por vários parágrafos.
- Sem colisão de texto com fundo em gradientes/dark blocks.

---

## 1) Home (`/`)

### Hero e blocos dark

- [ ] Título principal com contraste forte (quase branco em fundo escuro).
- [ ] Subtítulo legível sem esforço visual.
- [ ] Texto auxiliar (linha de suporte/hints) legível e não “cinza morto”.
- [ ] Links inline visíveis e distinguíveis do corpo.
- [ ] Chips/badges não perdem leitura em hover/focus.

### Seções reutilizáveis da home

- [ ] `HubPillarsSection`: títulos, descrições e CTAs legíveis em todos os cards.
- [ ] `WhereToStartSection`: ícones/labels não “somem” em fundos acentuados.
- [ ] `ProductsSection`: descrição + bullets legíveis em cards ativos e desabilitados.
- [ ] `ProblemSolutionSection`: coluna problema/solução com contraste claro de texto.
- [ ] `ConnectedProductsSection` e `WhyUseSection` (light): texto escuro confortável.
- [ ] `CrossSellBeyond`: cards legíveis em fundo claro com gradiente.
- [ ] `whatsapp/product-preview-section`: labels de mensagens legíveis.

---

## 2) Ferramentas (`/ferramentas`)

- [ ] Texto da faixa superior (entre links) com bom contraste.
- [ ] Links “Ver catálogo / WhatsApp Platform / Ver demo” claramente clicáveis.
- [ ] `ToolCard`:
  - [ ] título legível
  - [ ] descrição legível
  - [ ] badge legível
  - [ ] CTA com contraste suficiente
- [ ] Card desabilitado “Em breve” continua legível (sem sumir).
- [ ] Seções complementares (`WhyUse`, `ConnectedProducts`, `CrossSell`) legíveis sem zoom.

---

## 3) Páginas Legais (`/privacidade`, `/termos`, `/cookies`)

- [ ] Container central confortável em mobile/tablet/desktop.
- [ ] `h1` e data de atualização visíveis.
- [ ] `h2` com contraste forte e separação visual adequada.
- [ ] Parágrafos (`p`) e listas (`li`) confortáveis para leitura contínua.
- [ ] Links internos/externos visíveis e distinguíveis.
- [ ] Sem blocos com texto “lavado” em cinza claro demais.

---

## 4) Header Global

- [ ] Nome da marca legível em qualquer scroll state.
- [ ] Subtexto secundário (quando aparece) legível.
- [ ] Itens de navegação desktop legíveis (ativo/inativo).
- [ ] Dropdown de produtos:
  - [ ] títulos
  - [ ] resumo
  - [ ] badges
  - [ ] botões
- [ ] Mobile menu: links/ações legíveis e foco visível por teclado.

---

## 5) Footer Global

- [ ] Bloco institucional com contraste confortável.
- [ ] Links de colunas legíveis e com hover perceptível.
- [ ] Área legal (`privacidade/termos/cookies/contato`) legível.
- [ ] E-mail com destaque adequado e foco acessível.

---

## 6) Teste de Navegação por Teclado (Acessibilidade prática)

- [ ] `Tab` percorre links e CTAs principais sem perder indicador visual.
- [ ] `Enter/Space` ativa os elementos esperados.
- [ ] Focus ring visível em links importantes (`df-link`, header/footer, CTAs).

---

## 7) Resultado por Breakpoint

## Mobile (`375x812`)
- [ ] Aprovado
- [ ] Revisar
- [ ] Reprovado
- Observações:

## Tablet (`768x1024`)
- [ ] Aprovado
- [ ] Revisar
- [ ] Reprovado
- Observações:

## Desktop (`1280x800+`)
- [ ] Aprovado
- [ ] Revisar
- [ ] Reprovado
- Observações:

---

## 8) Registro de Não Conformidades

Use este formato:

- Página/Seção:
- Breakpoint:
- Problema visual:
- Classe/elemento envolvido:
- Severidade: baixa / média / alta
- Captura de tela:
- Status: aberto / corrigido

