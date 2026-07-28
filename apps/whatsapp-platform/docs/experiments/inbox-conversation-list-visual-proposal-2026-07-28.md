# Proposta visual e operacional — Fatia 1 · Lista de conversas (Inbox)

Data: **2026-07-28**  
Branch de trabalho: `docs/inbox-list-visual-proposal` (a partir de `main` @ `#161` KEEP empty state)  
Escopo desta etapa: **documento apenas** — **nenhuma alteração a componentes de produto**

Skills aplicadas (advisory / grounding): `product-grill`, `frontend-design`, `revenue-centric-design`, `nextjs-ui-polish` (tokens/estados), `whatsapp-platform-safe-change` (limites), `devflow-product-evidence` (plano de evidência), `test-hardening` (mapa de contratos a preservar).

---

## 1. Resumo executivo

A row atual (`ConversationItem`) concentra identidade, prévia, estado, responsável, SLA, CRM, score, linha WhatsApp, fila, alertas e ações numa pilha de **5–7 faixas + chips**. Header (`ChatHeader`), banner (`ConversationActionBanner`) e painel (`LeadDataPanel`) já repetem grande parte desses sinais.

**Proposta:** anatomia de **três faixas** — (1) identidade + tempo/SLA-exceção + não lidas; (2) prévia; (3) um estado dominante + responsável só quando acionável + Assumir/Fechar. CRM, score, etapa, linha, fila e badges redundantes saem da row sem sair do produto.

**Decisão recomendada:** `PROCEED`  
(com 2 pontos `BLOCKED_BY_PRODUCT_DECISION` explícitos: política unread vs pending; se responsável nomeado deve permanecer sempre na lista).

**Confirmação:** neste passo **não houve diff de produto** (só documentação / wireframe estático sob `docs/experiments`).

---

## 2. Evidências consideradas

| Fonte | Tipo | Uso |
|---|---|---|
| [Fase 1](./inbox-operational-hierarchy-phase1-2026-07-28.md) | Auditoria documentada | Inventário, densidade, invariantes |
| `ConversationItem.tsx` | Código | Anatomia e regras de render atuais |
| `ConversationsList.tsx` | Código | Handlers, filtros, agrupamento (fora do slice visual) |
| `inboxTypes.ts` → `WaInboxThreadRow` | Contrato | Campos disponíveis (não inventar dados) |
| `ChatHeader.tsx` | Código | Equivalentes pós-seleção |
| `conversationActionBannerLogic.ts` + `ConversationActionBanner.tsx` | Código | Banner high_wait / customer_waiting |
| `LeadDataPanel.tsx` + `leadPanelCopy.ts` | Código | Score, prioridade, hints |
| `ResponseAlertBadge.tsx` | Código | Limiares 5 min / 10 min |
| `conversationPreviewPrefix.ts` | Código | Prefixo Cliente/IA/Auto/Você |
| `inboxUi.test.tsx` | Testes | `conversation-item`, `pending-inbound-badge`, seleção |
| `useMediaMd.ts` + e2e inbox mobile | Código / testes | Suporte mobile comprovado (768px; 390×844 em e2e) |
| Empty state KEEP (#161) | Experimento anterior | Protocolo de evidência a reutilizar |
| Wireframe estático | `evidence/inbox-list-row-phase2/harness.html` | Proposta visual não-produto |

**Não usado como evidência de runtime:** screenshots de produção autenticada nesta etapa; métricas de tempo de scan (hipótese até Fase 4).

---

## 3. Problema operacional

| | |
|---|---|
| **Persona** | Agente de atendimento na Inbox |
| **Job** | Identificar quem precisa de atenção → entender última interação → selecionar → responder; contexto só se necessário |
| **Falha atual** | A fila compete consigo mesma: cada card é um mini-relatório; o operador decide *onde olhar* antes de *quem atender* |
| **Outcome (revenue-centric)** | Leading: tempo até selecionar conversa prioritária e até focar o composer. Lagging: tempo de primeira resposta / abandono de fila. Baseline numérica **não medida** nesta etapa (hipótese) |
| **Menor experimento** | Só visual da row; sem APIs, filtros ou regras novas |

---

## 4. Anatomia atual da row

**Fato (código `ConversationItem`):** ordem aproximada T→B / L→R:

1. Avatar (iniciais) + título (`contactName` ‖ `phoneNumber`) + tempo **ou** wait SLA (`responseDelayMs` se `awaiting_agent`) + badge `unreadCount`
2. Badge linha WhatsApp (`whatsappLine`)
3. Badge estado (`getConversationStateBadge`) + “Sugestão pendente” (`dealSuggested`)
4. Linha “Responsável: …” (ou “Sem responsável”) se não CLOSED
5. Prefixo · `lastMessagePreview` (`line-clamp-2`)
6. Row CRM: prioridade + `priorityGuidance` + **sempre** `leadScore` pts + `aiState` + (gated) FU/etapa
7. `ResponseAlertBadge` + `unansweredInboundCount` + fila + chip “Sem responsável” + chip awaiting_customer + “À espera” legado
8. Coluna Assumir / Fechar

Estilos: stripes danger/warning/brand; tokens `.df-inbox-list-chip`, `.df-chip-*`, `.df-inbox-row-*`, `--df-*`.

---

## 5. Inventário de repetições

| Sinal | Lista | Header | Banner | Painel |
|---|---|---|---|---|
| Precisa resposta / `awaiting_agent` | Badge + stripe + alert + chips | Badge estado | `customer_waiting` / `high_wait` | Badge + hint |
| Assignee / ausência | Texto + chip unassigned + Assumir | Copy + menu + Assumir | Indireto | Assignee |
| Prioridade CRM | Badge + guidance | Chip só HIGH | `high_wait` se HIGH | Stripe + label |
| SLA / espera | Wait + alert + stripe | `chat-header-sla` | Minutos no texto | — |
| Score | Sempre | — | — | Barra + labels |
| Estado conversa | Vários chips | Badge | Sim | Badge |
| Linha / fila | Badges | Texto / select | — | — |
| Preview / histórico | Prévia 2 linhas | — | — | — (mensagens no chat) |

---

## 6. Matriz KEEP / MOVE / REVEAL / REMOVE / BLOCK

Legenda: `KEEP_IN_ROW` · `MOVE_TO_HEADER` · `MOVE_TO_CONTEXT_PANEL` · `REVEAL_ON_SELECTION` · `EXCEPTION_ONLY` · `REMOVE_IF_REDUNDANT` · `BLOCKED_BY_PRODUCT_DECISION`

| Elemento atual | Classificação | Destino / nota |
|---|---|---|
| Identidade + avatar | **KEEP_IN_ROW** | Scan #1 |
| Tempo relativo (`lastMessageAt`) | **KEEP_IN_ROW** | Default à direita |
| Wait SLA compacto | **EXCEPTION_ONLY** | Só `awaiting_agent` **e** (`getResponseAlertLevel` ≠ none **ou** `slaLevel` ∈ {high,critical}) — limiares **já no código** (5/10 min) |
| Stripe urgente | **EXCEPTION_ONLY** | Reforço do wait; não substitui texto |
| Unread badge | **KEEP_IN_ROW** | Se `unreadCount > 0` |
| Prefixo · prévia | **KEEP_IN_ROW** | `line-clamp-2`; “—” se vazio |
| Um badge de estado | **KEEP_IN_ROW** | Um label dominante (matriz §7) |
| Assumir / Fechar | **KEEP_IN_ROW** | Handlers existentes; não são metadados |
| “Sem responsável” | **EXCEPTION_ONLY** | Só unassigned + `awaiting_agent`; **uma** representação (sem chip duplicado) |
| “Responsável: Nome” | **MOVE_TO_HEADER** | Também no painel; ver BLOCK abaixo se produto exigir na lista |
| Chip unassigned duplicado | **REMOVE_IF_REDUNDANT** | Mesma info que EXCEPTION_ONLY acima |
| ResponseAlertBadge textual | **REMOVE_IF_REDUNDANT** | Duplica wait + stripe + limiares |
| Chip “À espera” legado | **REMOVE_IF_REDUNDANT** | Coberto pelo estado dominante |
| “IA · aguarda cliente” | **REMOVE_IF_REDUNDANT** | Estado “Aguardando cliente” + prefixo “IA” |
| Prioridade CRM + guidance | **MOVE_TO_CONTEXT_PANEL** | Header já mostra HIGH; banner `high_wait` |
| `leadScore` pts | **MOVE_TO_CONTEXT_PANEL** | Sem decisão imediata na fila (fato: painel já tem barra) |
| `aiState` | **MOVE_TO_CONTEXT_PANEL** | Label amigável no painel |
| Etapa comercial / FU | **MOVE_TO_CONTEXT_PANEL** | Gated `devFlowProspectingUi` |
| Linha WhatsApp | **MOVE_TO_HEADER** | Filtro de linha permanece em `ConversationsList` |
| Nome da fila | **MOVE_TO_HEADER** | Select de fila no header |
| “Sugestão pendente” | **REVEAL_ON_SELECTION** | Deal UI / thread |
| Telefone quando há nome | **REVEAL_ON_SELECTION** | Header já mostra |
| OPEN/PENDING/CLOSED explícito | **MOVE_TO_HEADER** | Já no header |
| `unansweredInboundCount` vs unread | **BLOCKED_BY_PRODUCT_DECISION** | Teste exige `pending-inbound-badge`; produto deve escolher: fundir visualmente / manter dois / migrar teste |
| Responsável nomeado sempre na row | **BLOCKED_BY_PRODUCT_DECISION** | Proposta default = remover; se operação exigir scan de ownership, **ITERATE** |
| Mídia / conteúdo indisponível na row | **REVEAL_ON_SELECTION** | **Fato:** row só renderiza string `lastMessagePreview` ou “—”; recuperação de mídia está no thread (`MessageBubble` / media), **não** na lista — não inventar UI de mídia na row sem campo/API |

---

## 7. Anatomia proposta

```
┌────────────────────────────────────────────────────────────┐
│ [AV]  Identidade                         tempo|wait  ●N   │
│       Prefixo · prévia (máx. 2 linhas)                     │
│       ○ Estado dominante   [Sem responsável?]  [Assumir]   │
└────────────────────────────────────────────────────────────┘
         stripe esquerdo: selected (brand) | urgent (warning/danger)
```

### Matriz do estado dominante (um só)

| `conversationState` / condição | Label na row |
|---|---|
| `awaiting_agent` (ou legado needsReply sem state) | Precisa resposta |
| `in_progress` | Em atendimento |
| `awaiting_customer` | Aguardando cliente |
| CLOSED / `closed` | Encerrada (ou só estilo muted) |

### Densidade / espaçamento (nextjs-ui-polish)

- Máx. **3 faixas** de conteúdo  
- Padding desktop ~`px-2.5 py-2.5`; mobile lista ~`px-3 py-3` (alvo)  
- Gap avatar 10–12px  
- Sem row `.crm-inbox-row`  
- Chips: no máximo estado + (opcional) “Sem responsável”  
- Tokens: apenas `df-*` / classes inbox existentes (ajustar densidade, não inventar paleta)

### Truncamento da prévia

- Manter `line-clamp-2`  
- Prefixo semibold muted + ` · ` + texto  
- Vazio → “—” (comportamento atual)

---

## 8. Ordem de leitura visual

1. Identidade (quem)  
2. Prévia (o quê)  
3. Tempo / wait (quando / urgência)  
4. Estado dominante (o que fazer)  
5. Unread (novidade)  
6. Sem responsável + Assumir (exceção)  
7. Stripe (reforço, nunca único canal)

Assinatura visual (frontend-design): **stripe de exceção + wait tabular** — ousadia só na urgência; resto disciplinado no DS dark `df-*`.

---

## 9. Estados da row

| Estado | Comportamento proposto |
|---|---|
| **Normal** | Elevated bg; 3 faixas; border-b sutil |
| **Hover** | `df-brand-100` leve; sem novos chips |
| **Foco teclado** | `focus-visible` ring brand no `conversation-item`; Tab → Assumir → Fechar |
| **Selecionada** | Stripe brand 4px + ring inset; avatar brand; danger/warning prevalece se urgente |
| **Não lida** | Badge unread; sem mudar tipografia do título |
| **Urgente / SLA** | Wait colorido + stripe; label “Precisa resposta”; **sem** ResponseAlertBadge extra |
| **Sem responsável** | Texto único + Assumir (se `awaiting_agent`) |
| **Responsável atual** | Default proposta: **não** mostrar nome na row (header/painel). Se BLOCK de produto → manter linha curta |
| **Mídia / preview fraco** | Mostrar string da API ou “—”; detalhe/recuperação no chat após seleção |
| **Encerrada** | Muted; sem Assumir/Fechar |

---

## 10. Comportamento responsivo

| Viewport | Fato no código | Proposta |
|---|---|---|
| Desktop aside ~260–300px | `InboxShell` + `useMediaMd` | Mesma anatomia 3 faixas |
| Viewport estreito / mobile lista | `showSidebar` fullscreen; e2e 390×844 | Mesmos dados; padding/touch ≥40px em Assumir |
| Chat mobile | Após select, lista oculta | Fora do slice |

Não criar layout de dados diferente por breakpoint.

---

## 11. Acessibilidade

- Controlo principal: `<button data-testid="conversation-item">` com nome acessível = identidade (E2E já clica por nome)  
- Estado e urgência: **texto** (badge/wait) + stripe (cor não é o único canal)  
- `focus-visible` visível (tokens `df-focus` / ring brand)  
- Assumir/Fechar: botões com rótulo textual  
- `prefers-reduced-motion`: respeitar transições existentes se tocadas  
- Não remover `data-thread-id` / testids de seleção  

---

## 12. Wireframe textual / visual

### Textual

**A — Precisa resposta, com dono, sem SLA**

```
[JM]  João Mendes                         3m
      Cliente · Obrigado, fico no aguardo
      ○ Precisa resposta
```

**B — Sem dono + wait 12m**

```
[AB]  Ana Barbosa                        12m
      Cliente · Quero fechar hoje
      ○ Precisa resposta   Sem responsável   [Assumir]
```

**C — Aguardando cliente**

```
[CR]  Carlos Rua                          1h
      Você · Enviámos a proposta
      ○ Aguardando cliente
```

**D — Selecionada + unread**

```
[MR]  Maria Reis                     agora  ●2
      Cliente · Posso ligar amanhã?
      ○ Precisa resposta
```

### Visual no repositório

Abrir: `apps/whatsapp-platform/docs/experiments/evidence/inbox-list-row-phase2/harness.html`  
(HTML estático de proposta — **não** é componente React de produto.)

---

## 13. Comparação before / after

| Aspeto | Before (fato) | After (proposta) |
|---|---|---|
| Faixas | 5–7 + wrap de chips | 3 |
| Estados visíveis | Badge + alert + À espera + Aguardando + Sem dono | 1 estado (+ Sem responsável se exceção) |
| CRM / score / etapa | Na row | Painel / header HIGH |
| Linha / fila | Na row | Header + filtros existentes |
| SLA | Wait + badge textual + stripe | Wait + stripe só em exceção |
| Assignee nomeado | Sempre | Header (default) |
| Scan | Alto (hipótese) | Menor (a medir na evidência) |

---

## 14. Justificativa de cada remoção ou reposicionamento

| Ação | Porquê (fato ou hipótese) |
|---|---|
| Remover prioridade+guidance da row | **Fato:** repetido no painel; HIGH no header/banner. **Hipótese:** não acelera escolha além do sort SLA já feito na lista |
| Remover score | **Fato:** sempre visível mesmo 0; painel tem barra. **Hipótese:** não muda abertura imediata |
| Remover etapa/FU da row | **Fato:** gated + painel prospect. Comercial ≠ scan de atendimento |
| Remover linha/fila da row | **Fato:** filtros e header cobrem; economiza faixa |
| Remover ResponseAlertBadge | **Fato:** mesmos limiares 5/10 min que coloram wait/stripe |
| Remover “Responsável: Nome” | **Hipótese operacional** + **fato** de cobertura no header — marcada BLOCK se equipa discordar |
| Remover chip unassigned duplicado | **Fato:** duplica ausência |
| Manter Assumir/Fechar | **Fato:** handlers + testids; remover seria mudança de fluxo, não só visual |
| SLA EXCEPTION_ONLY | **Fato:** limiares existem; alinha “SLA = exceção acionável” |

---

## 15. Invariantes funcionais

| Invariante | Preservação |
|---|---|
| Seleção | `onSelect`, `data-testid="conversation-item"`, `data-thread-id` |
| Filtros / filas / URL / grupos sticky / sort | **Não tocar** `ConversationsList` nesta fatia |
| Contadores unread | Badge permanece |
| Pending inbound | Ver §6 BLOCK — não silenciar teste |
| Estados operacionais (dados) | Campos `WaInboxThreadRow` intactos; só render |
| Handlers Assumir/Fechar | `onAssume` / `onClose` + testids |
| Permissões de assign | Lógica `canAssume` / CLOSED inalterada |
| Multitenancy | Sem mudança de fetch/tenant |
| Teclado / a11y | §11 |
| Tokens `df-*` | Sem paleta ad hoc |
| Contrato API | Sem novos campos; sem remover shape |
| Prospect gate | Não expor UI interna a white-label |
| Empty state KEEP | Intocado |

**Mapa test-hardening (futura PR):**

- Unit: `inboxUi.test.tsx` (lista, pending, select, empty)  
- Header assignment/status (não dependem da densificação, regressão smoke)  
- E2E: `tests/e2e/inbox.spec.ts` (nome acessível da row; mobile 390×844)

---

## 16. Riscos e pontos não comprovados

| Item | Classificação |
|---|---|
| Tempo de scan / TTR melhora | **Hipótese** — medir na evidência |
| Operadores precisam ver dono na fila | **Não comprovado** — BLOCK de produto |
| Unread vs pending como um número | **Não decidido** — BLOCK de produto / teste |
| Preview de mídia específica na lista | **Não existe UI dedicada hoje** — não inventar |
| Alertas agregados no topo da lista (`inbox-stale-alert-*`) | Fora do slice; risco de ainda haver ruído acima das rows |
| Doc `INBOX_UI.md` (360px) | Desatualizado vs código (~260–300px) |

---

## 17. Critérios de aceite da futura implementação

1. Row com ≤3 faixas de conteúdo na maioria dos estados.  
2. Identidade, prévia, tempo e um estado dominam a leitura.  
3. Nenhum campo CRM/score/etapa/linha/fila renderizado na row (salvo decisão BLOCK que reverta).  
4. SLA textual/wait só em exceção (limiares atuais).  
5. “Sem responsável” no máximo uma vez; Assumir/Fechar intactos.  
6. Testids de seleção e ações verdes; pending resolvido conforme decisão de produto.  
7. Foco teclado visível; estado não só por cor.  
8. Só tokens `df-*` / classes inbox.  
9. Diff confinado a `ConversationItem` (+ CSS pontual + testes da row).  
10. Sem mudança de API, filtros, Prisma, middleware.

---

## 18. Plano de evidência before/after

Protocolo alinhado ao empty-state KEEP:

| Evidência | Critério |
|---|---|
| Desktop 1440×900 | Hierarquia clara; ≤3 faixas |
| Mobile 390×844 | Sem overflow; Assumir tocável |
| Teclado | Foco no `conversation-item`; ordem coerente |
| A11y | Estado/urgência com texto |
| Estados | normal, selected, urgent, unassigned, awaiting_customer, closed |
| Tempo até identificar prioritária | ≤ before (cronómetro / revisão) |
| Regressão | Seleção, assume, close, filtros |
| Manutenção | Diff mínimo |

Gate pós-implementação: `KEEP` \| `ITERATE` \| `ROLLBACK` \| `BLOCK` (evidência incompleta).

Harness de proposta (não substitui screenshots de produto): `evidence/inbox-list-row-phase2/harness.html`.

---

## 19. Escopo sugerido para uma única PR futura

**Incluir**

- `ConversationItem.tsx` (render only)  
- Ajustes mínimos em `globals.css` / classes `.df-inbox-*` da row se necessário  
- Atualização de `inboxUi.test.tsx` conforme decisão pending  
- Doc de evidência do experimento (after)

**Excluir**

- `ConversationsList` filtros/mutations/grouping  
- `ChatHeader`, banner, `MessageInput`, `LeadDataPanel`  
- APIs, schema, skills, outras superfícies  
- Dependências novas  

Título sugerido: `experiment(whatsapp): densify inbox conversation list row`

---

## 20. Decisão final

### `PROCEED`

A row proposta é claramente mais escaneável; identidade / mensagem / tempo / estado dominam; removidos têm destino comprovado no header/banner/painel; contratos podem permanecer intactos; a11y/teclado cobertos; PR isolada viável; dúvidas **não** foram escondidas — estão em `BLOCKED_BY_PRODUCT_DECISION`.

Resolver antes do merge da PR de implementação (não bloqueiam aprovar *esta* proposta):

1. Política **unread vs `unansweredInboundCount`**  
2. Se **responsável nomeado** deve permanecer sempre na lista  

Se a equipa rejeitar a anatomia de 3 faixas ou exigir CRM na fila → mudar para `BLOCK` / `ITERATE` nesta decisão.

---

## Confirmação de congelamento

- [x] Sem alterações em componentes de produto  
- [x] Sem handlers/contratos/regras/deps  
- [x] Sem redesign de header/editor/chat/painel  
- [x] Sem commit/push/PR nesta etapa (documento local na branch de docs)  
- [x] Sem evidências falsas de runtime autenticado  

**Caminho deste documento:**  
`apps/whatsapp-platform/docs/experiments/inbox-conversation-list-visual-proposal-2026-07-28.md`
