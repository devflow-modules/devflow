# DevFlow Product UI System

**Versão:** 1.0 · **Data:** 2026-06-10  
**Âmbito:** produto operacional DevFlow — especialmente `apps/whatsapp-platform` (inbox, dashboard, admin, settings, billing operacional)  
**Complemento de marca:** [DEVFLOW-BRAND-SYSTEM.md](./DEVFLOW-BRAND-SYSTEM.md) (site, marketing, conversão pública)

---

## 1. Objetivo

Este documento define **padrões visuais e operacionais** para interfaces de produto: densidade, espaçamento, cor semântica, tipografia, foco, alvos clicáveis e estados reais de atendimento (humano, IA, handoff, SLA, erros).

Diferente do Brand System, que orienta **landing, storytelling e conversão**, o Product UI System orienta **eficiência, legibilidade prolongada e decisão operacional** — operadores e gestores usam o app durante horas; a interface deve ser investigável, previsível e acessível.

**Fonte de verdade dos tokens de produto (WhatsApp Platform):** `apps/whatsapp-platform/src/app/globals.css` (`--df-*`, utilities `.df-*`).  
**Componentes partilhados:** `packages/ui` quando aplicável.

---

## 2. Diferença entre Brand UI e Product UI

| Dimensão | Brand UI | Product UI |
|----------|----------|------------|
| **Contexto** | Site, landing, `/demo` mock, materiais comerciais | Inbox, dashboard, admin, settings, operações |
| **Objetivo** | Conversão, narrativa, confiança inicial | Throughput, clareza de estado, baixo erro humano |
| **Densidade** | Respiro generoso, hero, storytelling | Compacta a confortável; listas longas |
| **Cor** | Verde de ação e CTA (~5% da tela) | Neutros dominantes; semântica só com significado |
| **Tipografia** | Headlines grandes, copy comercial | 13–16px corpo; metadados 12px |
| **Sombras / glow** | Permitidos em CTA e hero | Sutis em cards; sem glow marketing |
| **Estados** | Ilustrativos (mock dashboard) | Ligados a dados reais: `PENDING`, SLA, handoff, falha API |
| **Acessibilidade** | AA em copy principal | AA obrigatório + foco visível + alvos confortáveis |
| **Dados** | Fictícios / aspiracionais | Reais ou demo controlado — nunca misturar |

**Regra:** não copiar blocos de marketing (gradientes fortes, métricas mock, glow verde) para dentro do shell operacional.

---

## 3. Princípios

1. **Clareza operacional antes de estética** — o operador deve saber em 2 segundos o que precisa de ação.
2. **Densidade controlada** — mais informação por viewport que o site, sem parecer planilha ilegível.
3. **Semântica real de status** — cor só quando o backend/modelo tem estado correspondente.
4. **Verde contido** — brand para ação, foco e seleção; não para “tudo está bem”.
5. **Atendimento humano + IA segura** — distinguir bot, humano, handoff e bloqueio de IA visualmente.
6. **Tokens antes de valores soltos** — `--df-space-*`, `--df-brand-500`, `.df-badge-*`; evitar `#00d084` ou `p-3` ad hoc sem motivo.
7. **Contraste e acessibilidade como requisito** — não como polish final.
8. **Interface investigável** — status, timestamps, motivos de erro e IDs técnicos (quando úteis ao suporte) devem ser legíveis; logs na UI seguem [OBSERVABILITY-PILOT.md](../whatsapp-platform/OBSERVABILITY-PILOT.md) (sem PII).

---

## 4. Escala de espaçamento

Base **8px**, com microvalores quando o alinhamento óptico exige.

| Token sugerido | px | rem (16px base) | Uso |
|----------------|-----|-----------------|-----|
| `space-0.5` / micro | **2px** | 0.125rem | Borda interna, separador fino, ajuste óptico |
| `space-1` | **4px** | 0.25rem | Gap ícone↔texto em badge, indicador inline |
| `space-2` | **8px** | 0.5rem | Gap interno compacto, entre metadados |
| `space-3` | **12px** | 0.75rem | Item de lista compacto, padding vertical de badge |
| `space-4` | **16px** | 1rem | Padding padrão de card, painel, campo |
| `space-5` | **20px** | 1.25rem | Gap entre campos de formulário |
| `space-6` | **24px** | 1.5rem | Separação entre blocos, padding de modal |
| `space-8` | **32px** | 2rem | Seções internas de página |
| `space-10` | **40px** | 2.5rem | Blocos grandes, header de área |
| `space-12` | **48px** | 3rem | Área de página, respiro entre secções |
| `space-16+` | **64px+** | 4rem+ | Onboarding, empty states institucionais |

**Implementação actual (WhatsApp Platform):** `--df-space-1` (4px) … `--df-space-12` (48px) em `globals.css`. Valores 2px e 20px podem usar utilitários Tailwind pontuais até existirem tokens dedicados.

---

## 5. Uso de espaçamento por contexto

| Contexto | Padding / gap recomendado | Notas |
|----------|---------------------------|-------|
| **Lista de conversas** | padding item **12–16px** (`py-3 px-3` / `px-4`) | Preview + badge + timestamp na mesma linha; altura mínima confortável 56–64px |
| **Thread / mensagens** | gap entre bolhas **8–12px** | Agrupar por dia com **16–24px** antes do marcador de data |
| **Composer** | padding **12–16px**; gap toolbar **8px** | Área de envio fixa; não colar na borda inferior em mobile |
| **Dashboard cards** | padding **16–24px** | Métrica + label + hint; grid gap **16–24px** |
| **Formulários** | gap entre campos **16–20px** | Label → input **4–8px** |
| **Tabelas / admin** | célula **12–16px** vertical | Linhas densas: **12px**; confortável: **16px** |
| **Empty states** | padding vertical **48–64px** | Ícone + título + CTA centrados |
| **Modais** | padding corpo **24px**; header/footer **16–24px** | Largura máx. 480px (confirm) / 640px (form) |

**Gutters de página:** `--df-shell-px` (16px mobile → 24px tablet → 40px desktop).

---

## 6. Layout product shell

| Região | Dimensão | Token / referência |
|--------|----------|-------------------|
| **Sidebar desktop** | **240–280px** | Navegação principal; colapsável em tablet |
| **Topbar** | **56–64px** | Título de área + acções globais + presença |
| **Painel lateral** (detalhe thread, CRM, audit) | **320–400px** | Scroll independente; não comprimir inbox abaixo de 360px útil |
| **Inbox 3 colunas** | lista ≥280px · chat flex · painel opcional 320px | Em &lt;1024px: lista OU chat em fullscreen |
| **Gutters** | **16–24px** | `--df-shell-px` |
| **Mobile** | navegação inferior ou drawer | Targets **44–48px**; composer sticky |

**Max width conteúdo administrativo:** `--df-shell-max-width: 72rem` para páginas de settings/dashboard não-inbox.

---

## 7. Cores por função

Mapeamento conceptual → tokens `--df-*` / utilities `.df-*`:

| Função | Papel | Tokens de referência | Quando usar |
|--------|-------|---------------------|-------------|
| **Neutral** | Canvas, superfícies, texto base | `--df-bg-app`, `--df-bg-elevated`, `--df-border-dark`, `--df-text-*` | 80%+ da UI |
| **Brand** | Ação primária, foco, seleção, link crítico | `--df-brand-500`, `--df-brand-100` | CTA, item seleccionado, ring de foco |
| **Success** | Concluído, enviado, resolvido | `--df-success-*`, `.df-badge-success` | `sent`, `resolved`, online operacional |
| **Warning** | Atenção, fila, handoff, SLA limite | `--df-warning-*`, `.df-badge-warning` | `PENDING`, `needs_human`, SLA médio |
| **Danger** | Erro, falha, SLA crítico | `--df-danger-*`, `.df-badge-error` | `failed`, `signature_invalid`, atraso crítico |
| **Info** | Contexto, em atendimento, métrica neutra | `.df-badge-info`, `--df-feedback-info-text` | `in_progress`, hints, KPI auxiliar |
| **Muted** | Metadado, timestamp, encerrado | `--df-text-muted`, `.df-badge-muted` | `CLOSED`, legendas, notas legais |
| **Inverse** | Texto sobre brand sólido | `--df-brand-900` / branco | Botão primário, badge sólido brand |
| **Input** | Campos e chips | `--df-form-control-*`, `--df-chip-muted-*` | Formulários, filtros |

### Regras de cor

- **Brand ≠ success** — brand é intenção/ação; success é resultado já ocorrido.
- **Warning** para handoff, `PENDING`, SLA em risco — não para “destaque bonito”.
- **Danger** só para erro real ou urgência crítica — não para marketing.
- **Muted** não carrega dados necessários à decisão (preço, SLA activo, erro).
- **Não** usar accent brand para codificar status semântico (ex.: thread urgente em verde).

**Admin sensível:** família `--df-admin-*` (âmbar) para secções de configuração privilegiada — distinto de warning operacional.

---

## 8. Contraste e acessibilidade

| Requisito | Rácio mínimo (WCAG 2.1 AA) | Aplicação DevFlow |
|-----------|----------------------------|-------------------|
| Texto normal (&lt;18px regular) | **4.5:1** | `--df-text-primary` sobre `--df-bg-app`; corpo em cards |
| Texto grande (≥18px ou 14px bold) | **3:1** | Títulos de card, métricas 24–32px |
| UI components, bordas, ícones informativos | **3:1** | Bordas de input, ícones de status, chevrons |
| Placeholder | ≥4.5:1 preferível; nunca único indicador | Usar label visível; placeholder reforço apenas |
| Status | **cor + texto + ícone** | Badges incluem label (“Precisa resposta”, não só bolinha vermelha) |

**Proibido:** estado comunicado apenas por cor (ex.: linha vermelha sem legenda).  
**Timestamps:** `--df-text-muted` só se a informação for realmente secundária; SLA activo usa warning/danger com texto.

**Teste recomendado:** verificar pares principais no tema escuro actual antes de ship (Figma contrast ou DevTools).

**Automatização (WhatsApp Platform):** `pnpm test:a11y` em `apps/whatsapp-platform` — Playwright + `@axe-core/playwright`, tags WCAG 2.1 AA; falha em violações **critical/serious** (inclui `color-contrast`). Superfícies Product UI: `tests/a11y/product-ui-a11y.spec.ts`. Detalhes em [PRODUCT-UI-AUDIT.md](../whatsapp-platform/PRODUCT-UI-AUDIT.md) (secção P2-5).

---

## 9. Focus e keyboard navigation

### Padrão canónico

| Propriedade | Valor |
|-------------|-------|
| Outline | **2px** solid ou box-shadow equivalente |
| Offset | **2px** (`ring-offset-2`) |
| Cor | `--df-brand-500` ou cor com contraste ≥3:1 sobre fundo |
| Estilo | `focus-visible:` — não mostrar ring em clique mouse se possível |

**Implementação de referência:** `.df-btn-*`, `.df-inbox-toolbar-btn`, `packages/ui` Button — `focus-visible:ring-2 focus-visible:ring-[var(--df-brand-500)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--df-bg-app)]`.

### Ordem de tabulação sugerida (inbox)

1. Filtros / busca  
2. Lista de conversas (itens focáveis)  
3. Acções do header da thread  
4. Lista de mensagens (acções por mensagem se existirem)  
5. Composer (textarea → enviar)

**Aplicar foco visível em:** buttons, links, inputs, selects, tabs, conversation item, message actions, dropdowns, cards clicáveis, linhas de tabela admin.

---

## 10. Target size

| Contexto | Tamanho mínimo | Recomendado |
|----------|----------------|-------------|
| Mínimo técnico (ícone isolado) | **24×24px** | Só com tooltip/aria-label claro |
| Desktop confortável | **32×32px** | Toolbar inbox, acções secundárias |
| Botão padrão | **40px** altura | `.df-btn`, formulários |
| Botão primário / CTA produto | **44–48px** | Enviar mensagem, assumir conversa |
| Mobile | **44–48px** | Qualquer acção frequente |
| Ações críticas (enviar, handoff, fechar) | **nunca &lt;32×32px** | Preferir 40px+ |

**Hit area:** padding pode expandir alvo sem aumentar ícone visual (ex.: `p-2` em ícone 20px).

---

## 11. Tipografia de produto

| Nível | Tamanho | Line-height | Peso | Uso |
|-------|---------|-------------|------|-----|
| Page title | **24–32px** | 1.2–1.3 | 600–700 | H1 de área (Inbox, Settings) |
| Section title | **18–20px** | 1.3 | 600 | Blocos de dashboard |
| Card metric | **24–32px** | 1.1 | 700 | KPI (`tabular-nums`) |
| Body | **14–16px** | 1.5 | 400 | Texto geral, descrições |
| Mensagem (chat) | **14–15px** | **1.5** | 400 | Bolhas inbound/outbound |
| Tabela / lista | **13–14px** | 1.4 | 400–500 | Conversas, admin tables |
| Label | **12–14px** | 1.3 | 500–600 | Form labels, colunas |
| Metadata / timestamp | **12px** | 1.3 | 400 | Hora, ID curto, hint |
| Badge | **10–11px** | 1.2 | 600–700 | Uppercase opcional; mínimo legível |

**Fonte:** herdar stack do Brand System (sans system / Inter conforme projeto).  
**Números operacionais:** `tabular-nums` em métricas, contadores e SLA.

---

## 12. Estados operacionais

Estados do domínio WhatsApp Platform → família visual. Sempre **label textual** + cor.

| Estado | Significado operacional | Família | Implementação de referência |
|--------|-------------------------|---------|----------------------------|
| `OPEN` | Conversa activa | neutral / info | Badge “Em atendimento” ou neutro |
| `PENDING` | Aguarda humano / handoff | **warning** | Prioridade HIGH + fila |
| `CLOSED` | Encerrada | **muted** | `.df-badge-muted`, texto secundário |
| `HIGH` (prioridade) | Urgência | **warning** → **danger** se SLA crítico | Ordenação na lista |
| `needs_human` | Tag / escalonamento | **warning** | Tag + cor de fila |
| `handoff_requested` | IA/automação pediu humano | **warning** | Banner + badge |
| `sent` | Outbound aceite pela API | **success** | Tick de entrega |
| `failed` | Falha envio / API | **danger** | `.df-badge-error`, mensagem de erro |
| `queued` | Na fila sem assign | **info** ou warning leve | “Sem responsável” |
| `resolved` | Caso concluído | **success** | Pós-fecho ou auto-resolve |
| `ai_safe` | IA em safe mode / bloqueio | **info** | Settings + hint em thread |
| `ai_handoff` | IA escalou | **warning** | Alinhado a `PENDING` |
| `tenant_unresolved` | Webhook sem tenant | **danger** (ops) | Só em logs/admin — não inbox cliente |
| `signature_invalid` | Webhook rejeitado | **danger** (ops) | Painel admin / logs |

### Estados de conversa (UI derivada)

Mapeamento em `conversationStateUi.tsx`:

| `conversationState` | Label UI | Família |
|---------------------|----------|---------|
| `awaiting_agent` | Precisa resposta | danger / error badge |
| `in_progress` | Em atendimento | info |
| `awaiting_customer` | Aguardando cliente | warning |
| `closed` | Encerrada | muted |

### SLA

| Nível | Família |
|-------|---------|
| ok | success / neutral |
| medium | warning (`.df-badge-sla-medium`) |
| high | warning forte |
| critical | danger (`.df-badge-sla-critical`, `--df-danger-sla-*`) |

**Seleccionado / actual:** fundo `--df-brand-100`, borda brand suave — não confundir com success.

---

## 13. Componentes prioritários

### Inbox item (lista de conversas)

- Altura mínima **56px**; padding **12–16px**
- Nome **14px** semibold; preview **13px** muted (1 linha ellipsis)
- Badge pendências inbound à direita; SLA à esquerda do tempo
- Estado seleccionado: brand soft + borda lateral 2–3px brand
- Hover: elevação subtil ou `bg` elevated — sem glow

### Message bubble

- Inbound: `--df-msg-inbound-bg` / `--df-msg-inbound-fg`
- Outbound agente: superfície elevated ou brand soft contido
- Outbound bot/IA: distinção por label “Bot” / ícone — não só cor
- Meta (hora, status): **12px** `--df-msg-inbound-meta`
- Gap entre bolhas do mesmo autor: **4px**; troca de autor: **12px**

### Status badge

- Classes: `.df-badge`, `.df-badge-{success|warning|danger|info|muted|error}`
- Sempre texto curto; ícone opcional 12–14px
- Altura confortável **20–24px** (compact); não abaixo de 18px com texto

### Queue badge

- Cor da fila (`queue.color`) com contraste verificado
- Nome da fila truncado; fundo soft + ring neutro

### Thread header

- Altura **56–64px**; `.df-inbox-header`
- Nome contacto + linha WhatsApp + badges SLA / estado
- Acções primárias à direita (Assumir, Encerrar) — target ≥40px

### Composer

- Textarea min-height **44–80px**; resize vertical opcional
- Botão enviar **44–48px**; desactivado com opacity + `aria-disabled`
- Atalhos visíveis (Enter / Shift+Enter) em hint **12px**

### Admin table

- Header sticky; zebra subtil ou border-row
- Densidade **compact**; acções em menu ⋯ com target 32px+
- Status em badge semântico, não cor de linha inteira

### Metric card

- Padding **16–24px**; `.df-surface` / elevated
- Valor **24–32px** `tabular-nums`
- Label **12px** uppercase tracking opcional
- Hint **12px** muted

### Modal

- Overlay escuro 40–60% opacity
- Corpo **24px** padding; botões footer alinhados à direita (primário último no DOM para tab natural em LTR)
- Fechar 32×32 mínimo

### Toast

- 3–5s visível; success/warning/danger/info semântico
- Texto **14px**; acção opcional link brand

### Empty state

- Ícone 48px muted; título **18px**; descrição **14px**
- Um CTA primário; padding vertical **48px+**

### Error state

- `.df-feedback-error` ou danger soft
- Mensagem humana + código técnico em **12px** monospace se útil
- Acção de retry quando aplicável

---

## 14. Densidade

| Nível | Onde | Espaçamento | Tipografia |
|-------|------|-------------|------------|
| **Compact** | Admin tables, logs, picker denso | 8–12px gaps; linhas 40–48px | 13px |
| **Comfortable** | Inbox padrão, dashboard, settings | 12–16px; linhas 56–64px | 14px |
| **Spacious** | Onboarding, empty, wizard, demo guiada | 24–48px; blocos separados | 15–16px |

**Inbox:** default **comfortable**; permitir toggle compact (futuro) para equipas grandes.  
**Não** usar spacious na lista de conversas — reduz throughput.

---

## 15. Do’s and Don’ts

### Do

- Usar tokens `--df-*` e classes `.df-*`
- Manter espaçamento da escala 8px (com 2/4px pontuais)
- Aplicar status semântico alinhado ao modelo (`WaInboxThreadStatus`, delivery, IA)
- Preservar contraste AA em texto e controlos
- Mostrar feedback de loading/sucesso/erro em acções de envio e handoff
- Distinguir humano vs automação nas mensagens
- Usar `focus-visible` em todos os controlos interactivos

### Don’t

- Usar verde brand para indicar success operacional genérico
- Aplicar cor sem significado de negócio
- Colocar dados críticos em `--df-text-muted`
- Remover ou esconder outline de foco (`outline: none` sem substituto)
- Usar alvo &lt;32px em “Enviar”, “Assumir”, “Handoff”
- Misturar dados reais de piloto em tenant demo comercial
- Importar shadows/glows de marketing (`.df-shadow-cta`) para inbox/admin
- Depender só de cor para SLA, erro ou handoff

---

## 16. Checklist antes de nova tela do produto

- [ ] Usa tokens (`--df-space-*`, cores, radius) — sem hex solto?
- [ ] Hierarquia clara (título → contexto → acção)?
- [ ] Estados visuais mapeiam enums reais do backend?
- [ ] Status tem texto e/ou ícone além da cor?
- [ ] Foco visível em todos os interactivos?
- [ ] Targets ≥32px (≥44px mobile) nas acções principais?
- [ ] Layout testado em **360px** e **1280px**?
- [ ] Contraste AA verificado no tema escuro?
- [ ] Densidade adequada ao contexto (compact vs comfortable)?
- [ ] Dados sensíveis mascarados (telefone, tokens)?
- [ ] Feedback de erro/sucesso/loading presente?
- [ ] Não duplica CTA primário verde na mesma viewport?

---

## 17. Próximos passos

### Auditoria visual recomendada (por área)

| Área | Ficheiros / rotas | Foco da auditoria |
|------|-------------------|-------------------|
| Inbox lista | `ConversationsList.tsx` | densidade, SLA, seleccionado |
| Thread / chat | `MessageList.tsx`, `ChatWindow` | bolhas, contraste, metadados |
| Composer | componentes de envio | target enviar, estados disabled |
| Dashboard | `DashboardAiClient`, manager metrics | cards, hierarquia KPI |
| Admin tenants | `/admin/*` | tabelas, `--df-admin-*` |
| Settings / IA | `/settings/ai` | safe mode, copy claro |
| Billing | `/settings/billing` | não confundir com inbox; neutros |

### Evolução do sistema

1. Alinhar tokens 2px/20px em `globals.css` (`--df-space-0.5`, `--df-space-5`).
2. Documentar mapa enum → badge num único módulo (parcialmente em `conversationStateUi.tsx`).
3. Storybook ou página interna `/design-system` (P2) — opcional.
4. Testes de contraste automatizados em CI (P2).

### Documentos relacionados

- [DEVFLOW-BRAND-SYSTEM.md](./DEVFLOW-BRAND-SYSTEM.md) — marca pública e regra 80/15/5
- [PRODUCT-UI-AUDIT.md](../whatsapp-platform/PRODUCT-UI-AUDIT.md) — auditoria visual do app (aderência, gaps, backlog de correção)
- [REAL-APP-DEMO.md](../whatsapp-platform/REAL-APP-DEMO.md) — demo comercial sem dados reais
- [OBSERVABILITY-PILOT.md](../whatsapp-platform/OBSERVABILITY-PILOT.md) — feedback técnico na operação

---

## Histórico

| Data | Alteração |
|------|-----------|
| 2026-06-10 | Versão inicial — Product UI System |
| 2026-06-09 | Implementação P0 inbox WhatsApp Platform: `.df-message-list-scroll`, `.df-delivery-status-*`, `.df-inbox-row-actions`, `.df-inbox-list-chip`, `.df-panel-ai-preview` (dark) |
| 2026-06-09 | Implementação P1 dashboard: `.df-metric-card`, `.df-metric-subcard--*`, `.df-status-summary-banner--*`, `.df-plan-column-highlight` |
| 2026-06-09 | Implementação P1 billing/onboarding: `.df-evaluation-ribbon`, `.df-admin-header-ring`, `.df-onboarding-card` |
