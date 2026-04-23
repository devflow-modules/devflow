# Checklist — demos do ecossistema DevFlow

Use na validação final (comercial + merge), alinhado a `ACCEPTANCE_CRITERIA.md` e `DEFINITION_OF_DONE.md`.

## Clareza em &lt; 30 segundos

- [ ] Visitante identifica **problema** (dor) na headline ou no strip de 4 passos.
- [ ] **Funcionamento** é compreensível sem jargão técnico obrigatório.
- [ ] **Resultado** é visível (card, ficha, lista de outputs ou equivalente).
- [ ] **Próximo passo comercial** está explícito (CTA primário + secundário quando couber).

## CTAs padronizados

- [ ] **Primário:** `demoCtaPrimaryClass` (ação principal: abrir demo, consultar, ver produto).
- [ ] **Secundário:** `demoCtaSecondaryClass` (site externo, alternativa, navegação).
- [ ] Eventos: `open_demo` ao abrir demo ao vivo / superfície de demo; `try_product` com `cta_variant` quando for conversão explícita.

## Estados de UI

- [ ] **Loading:** feedback visível + `aria-busy` / `role="status"` onde aplicável.
- [ ] **Vazio:** mensagem curta orientando ação (sem parecer erro).
- [ ] **Erro:** tom seguro, sem stack; `role="alert"` em falhas bloqueantes.
- [ ] **Sucesso:** painel distinto (verde suave / `demoSuccessPanelClass` ou card).

## Visual

- [ ] **Espaçamento:** seções `py-10`–`py-14` ou `demoSectionMutedClass` entre blocos grandes.
- [ ] **Cards:** `demoCardClass` ou equivalente (`border-border`, `rounded-2xl`).
- [ ] **Badges / eyebrow:** `demoEyebrowClass` no topo de heros e blocos de demo.
- [ ] **Hierarquia:** um `h1` por página; demos com `h2`/`h3` consistentes.

## Mobile

- [ ] CTAs com altura tocável (~44px) e coluna única em telas estreitas.
- [ ] Grids de 4 colunas degradam para 2 ou 1 sem texto cortado.

## SEO e analytics

- [ ] `metadata` com `title`, `description`, `canonical` nas páginas de produto/demo.
- [ ] `openGraph`/`twitter` coerentes com a promessa de valor.
- [ ] Analytics: superfícies nomeadas (`surface`) para filtrar no Vercel Analytics.

## Smoke manual rápido

- [ ] `/produtos` — cards e links.
- [ ] `/produtos/whatsapp-platform` — narrativa alinhada ao [WHATSAPP-PLATFORM-OVERVIEW](../whatsapp/WHATSAPP-PLATFORM-OVERVIEW.md).
- [ ] `/demo` — fluxo demo WhatsApp.
- [ ] *(Opcional / fora do foco de lançamento atual)* `/produtos/investigamais`, `/produtos/funklab-studio` — apenas se essas landings estiverem ativas na release.
- [ ] `/ferramentas/consulta-cnpj` — se existir na build: banner demo, loading, erro simulado, sucesso, CTAs do rodapé do card.

## Build e testes

- [ ] `pnpm test` (ou escopo Vitest afetado) verde.
- [ ] Lint nos arquivos tocados.
- [ ] Sem `console.log` novo em path de produção.
