# DevFlow Labs Brand Guidelines

## Posicionamento

- Marca principal: `DevFlow Labs`.
- Assinatura institucional: `Automação · Sistemas · Resultados`.
- Arquitetura de marca:
  - `DevFlow Labs` = marca guarda-chuva.
  - `WhatsApp Platform` = produto/módulo do ecossistema.
- Linguagem visual: dark premium, contraste alto, destaque em verde tecnologico.

## Paleta Oficial

### Core

- `background`: `#030607`
- `surface`: `#07100F`
- `surfaceElevated`: `#0B1715`
- `brand green`: `#00D084`
- `brand green hover`: `#00A86B`
- `text primary`: `#F7F9F8`
- `text secondary`: `#A8B3AF`
- `border brand`: `rgba(0, 208, 132, 0.14)`
- `brand soft`: `rgba(0, 208, 132, 0.12)`

### Semanticas

- `success`: verde de confirmacao (fundo/contorno/texto semanticamente coerentes)
- `warning`: amarelo de atencao
- `danger`: vermelho para risco/erro
- `info`: azul para informacao neutra

## Uso de Logo

- Logo completo (`DevFlow Labs` + assinatura) apenas em:
  - hero institucional
  - footer
  - materiais comerciais e marketing
- Simbolo `DF` em:
  - sidebar
  - favicon
  - loaders
  - telas internas operacionais
- Em telas pequenas operacionais:
  - evitar tagline
  - priorizar simbolo e nome do modulo

## Tipografia

- Priorizar leitura em contraste alto no fundo escuro.
- Titulo: peso forte para hierarquia.
- Corpo: cor secundaria para textos de apoio.
- Links e CTAs: usar verde de marca com hover padronizado.

## Componentes e Classes Semanticas

Classes globais obrigatorias:

- `df-page`
- `df-surface`
- `df-surface-elevated`
- `df-brand-gradient`
- `df-glow-brand`
- `df-text-muted`
- `df-border-brand`

Diretrizes:

- CTAs primarios sempre no verde da marca.
- Cartoes com borda sutil verde (`df-border-brand`).
- Estados hover/focus consistentes entre Portal e WhatsApp Platform.

## Regras Para Portal

- Header e footer com base `df-surface`.
- Hero e seções institucionais com `df-page` + `df-brand-gradient`.
- Product cards, demo cards e cards de ferramentas:
  - fundo `df-surface` ou `df-surface-elevated`
  - borda de marca sutil
  - CTA verde primario
- Landing de WhatsApp/automacao deve manter a mesma assinatura visual do portal.

## Regras Para WhatsApp Platform

- Base visual do app interno segue DevFlow Labs.
- Nome do produto em contexto: `WhatsApp Platform`.
- Sidebar e header interno: simbolo `DF` + rotulo de produto.
- Dashboard e inbox:
  - cards em superficie escura elevada
  - badges SLA e status com escala semantica
  - estados de IA com destaque de marca sem quebrar legibilidade
- Painel admin de ativacao WhatsApp:
  - manter codificacao semantica (info, warning, success, danger)
  - preservar densidade operacional e escaneabilidade

## White-label

- Nao duplicar CSS de layout/componentes.
- Estrutura de tema:
  - `themeMode: "devflow" | "client_branded"`
  - aplicado via `data-theme` no `html`
- `client_branded` pode trocar:
  - logo
  - nome exibido
  - cor primaria
- `client_branded` nao pode alterar:
  - layout
  - UX
  - componentes base
  - arquitetura do app

## Usos Proibidos

- Fundo claro como base predominante em telas de marca.
- CTA principal fora da cor primaria definida.
- Misturar multiplas cores primarias por modulo sem `themeMode`.
- Usar tagline em telas operacionais pequenas.
- Alterar estrutura de rotas, autenticacao, billing ou integracoes por motivo visual.
