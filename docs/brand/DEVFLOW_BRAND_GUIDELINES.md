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

## Checklist Final de QA Visual

- [ ] Todas as telas principais usam base escura (`df-page`) sem blocos claros dominantes.
- [ ] Superficies de cards e paineis usam `df-surface` ou `df-surface-elevated`.
- [ ] Bordas de cards/tabelas usam `df-border-brand` ou variante semantica equivalente.
- [ ] CTA primario usa verde DevFlow (`#00D084`) e hover `#00A86B`.
- [ ] Texto principal/apoio com contraste: `text primary` / `text secondary`.
- [ ] Sidebar operacional com simbolo `DF`; logo completo apenas no contexto institucional.

## Regras de Estados Dinamicos

- `hover`: realce sutil em verde (`df-brand-soft`) sem trocar para azul template.
- `focus`: usar ring com token de marca (`--df-brand-*` / `--devflow-brand`).
- `active`: manter legibilidade em fundo escuro com contraste alto.
- `disabled`: reduzir opacidade sem perder leitura do label.
- `loading`: spinner/barras em verde DevFlow ou neutro dark; evitar azul default.
- `error/success/warning/info`: usar tokens semanticos oficiais, nunca cores hardcoded fora do sistema.
- `empty/skeleton`: containers escuros com borda sutil de marca.
- `toast/alert/dialog/modal/dropdown`: fundo escuro elevado + borda de marca/semantica.

## Regras Mobile e Responsividade

- Breakpoints minimos de QA: `390px`, `768px`, desktop.
- Evitar overflow horizontal em listas/tabelas/cards/chat.
- Header e sidebar devem manter toque facil (alvos minimos de clique).
- Logos e simbolos com respiro visual, sem compressao ou distorcao.
- Chat/inbox: scroll vertical fluido, input sempre acessivel, sem sobreposicao de painel.

## White-label (Smoke Test)

- Estrutura obrigatoria: `data-theme="devflow"` e `data-theme="client_branded"`.
- `client_branded` pode alterar apenas `brand primary`, logo e nome.
- Layout, UX, espacamento e componentes continuam com base DevFlow.
- Nao duplicar estilos por tema; apenas sobrescrever tokens necessarios.
- Validar contraste apos troca de cor primaria antes de promover para producao.

## Exemplos de Uso

Correto:

- Card operacional: `df-surface` + `df-border-brand` + texto primario/muted.
- CTA principal: fundo verde DevFlow, label escuro de alto contraste.
- Empty state: bloco escuro elevado com texto muted e acao secundaria.

Incorreto:

- Card branco como fundo predominante em paginas operacionais.
- Focus ring azul/purpura herdado de template.
- Tagline institucional em header de telas operacionais pequenas.
- Duplicar CSS para tema cliente em vez de trocar tokens.

## Componentes Criticos Padronizados

- Portal: `header`, `footer`, `hero`, `products hub`, `tools hub`, `demo guided experience`.
- WhatsApp Platform: `AuthScreenShell`, `AppShell`, `AppSidebar`, `DashboardClient`, `MetricsSection`.
- Inbox: `InboxShell`, `ConversationsList`, `ConversationItem`, `ChatWindow`, `MessageBubble`, `ChatHeader`.
- Admin WhatsApp: `AdminWhatsappClient`, `ActivationMetricsHeader`, `ProvisionChannelForm`, `ChannelVerificationCard`.
