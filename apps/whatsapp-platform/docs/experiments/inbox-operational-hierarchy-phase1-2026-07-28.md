# Fase 1 — Auditoria Inbox (lista de conversas)

Data: **2026-07-28**  
Escopo: **somente leitura** — sem alteração de código  
Pré-requisito: empty state KEEP ([#161](https://github.com/devflow-modules/devflow/pull/161))

## Decisão de produto

| Campo | Valor |
|---|---|
| Job do operador | Ver quem espera → abrir → responder |
| Problema | Excesso de sinal na fila; cada row é um mini-relatório |
| Menor experimento | Simplificar **só** `ConversationItem` (fatia 1) |
| Non-goals | APIs, filtros, handlers, empty state, shell completo |
| Veredito | **go** na fatia 1 |

## Arquitetura alvo (referência)

1. Navegação global recolhível  
2. Fila de conversas  
3. Conversa + editor  
4. Contexto do cliente sob demanda  

Hierarquia de atenção: quem espera → o que disse → o que responder → próximo estado → contexto extra.

## Inventário (shell)

| Região | Ficheiro | Símbolo |
|---|---|---|
| Página | `src/app/(protected)/inbox/page.tsx` | `InboxPage` |
| Shell | `src/components/inbox/InboxShell.tsx` | `InboxShell` |
| Lista | `src/components/inbox/ConversationsList.tsx` | `ConversationsList` |
| Item | `src/components/inbox/ConversationItem.tsx` | `ConversationItem` |
| Empty | `src/components/inbox/InboxSidebarEmpty.tsx` | `InboxFilterEmpty` |
| Header | `src/components/inbox/ChatHeader.tsx` | `ChatHeader` |
| Chat | `src/components/inbox/ChatWindow.tsx` | `ChatWindow` |
| Banner | `src/components/inbox/ConversationActionBanner.tsx` | `ConversationActionBanner` |
| Mensagens | `src/components/inbox/MessageList.tsx` | `MessageList` |
| Editor | `src/components/inbox/MessageInput.tsx` | `MessageInput` |
| CRM | `src/components/inbox/LeadDataPanel.tsx` | `LeadDataPanel` |
| Métricas | `src/components/inbox/InboxMetricsPanel.tsx` | `InboxMetricsPanel` |
| Breakpoint | `src/components/inbox/useMediaMd.ts` | `md` = 768px |

## Densidade atual da row

`ConversationItem` empilha tipicamente **5–7 faixas** + até ~6 chips:

1. Avatar + título + tempo **ou** wait SLA + unread  
2. Linha WhatsApp  
3. Badge de estado + “Sugestão pendente”  
4. “Responsável: …”  
5. Prefixo · preview  
6. Prioridade CRM (+ hint) + score pts + aiState + FU + etapa  
7. ResponseAlert + pending inbound + fila + Sem responsável + Aguardando cliente  
8. Ações Assumir / Fechar  

Tokens: `.df-inbox-list-chip`, `.df-chip-*`, `.df-inbox-row-*`, `--df-*`.

## Informação repetida

| Conceito | Lista | Header | Banner | Painel |
|---|---|---|---|---|
| Precisa resposta / awaiting_agent | Badge + stripe + alert + chips | Badge | Action banner | Badge + hint |
| Responsável / ausência | Linha + chip unassigned | Texto + menu + Assumir | Indireto | Assignee |
| Prioridade CRM | Badge + guidance | Só HIGH | high_wait | Stripe + label |
| SLA / espera | Wait label + row style | `chat-header-sla` | Minutos no texto | — |
| Score | Sempre (`lead-score-list`) | — | — | Barra + label |

## Classificação (só list-item)

### Primário (ficar na lista)

- Identidade (`contactName` ‖ `phoneNumber`) + avatar  
- Tempo relativo **ou** wait SLA compacto (`awaiting_agent`)  
- Preview + prefixo  
- **Um** estado principal (badge *ou* stripe equivalente — não ambos + 3 chips)  
- Responsável **ou** “Sem responsável” (**uma** representação)  
- Unread  
- Assumir / Fechar (handlers existentes)

### Secundário (header / thread aberta)

- Telefone completo quando há nome  
- OPEN/PENDING/CLOSED explícito  
- SLA label completo  
- `ResponseAlertBadge` textual (se wait + stripe bastarem)  
- Linha WhatsApp detalhada  
- “Sugestão pendente”  
- Nome da fila (se editável no header)

### Contextual (painel / sob demanda)

- Prioridade CRM + `priorityGuidance` multi-linha  
- `leadScore` pts  
- `aiState`  
- Prospect stage / FU (`devFlowProspectingUi`)  
- `unansweredInboundCount` (candidato; preservar testid até migrar teste)  
- leadData detalhado  

## Invariantes funcionais

- Handlers: `onSelect`, `onAssume` → `assignConversation`, `onClose` → `updateConversationStatus`  
- Filtros / URL / agrupamento sticky / ordenação SLA — **fora** do slice  
- Contrato `WaInboxThreadRow` — não remover campos da API; só deixar de renderizar  
- Testids críticos: `conversation-item`, `pending-inbound-badge` (asserção em `inboxUi.test.tsx`), `assignee-line`, `sla-wait-label`, `conversation-state-badge`, `action-assume`, `action-close`, `unread-count-badge`  
- Suites: `inboxUi.test.tsx`, e2e `inbox.spec.ts` (incl. 390×844)  
- Multitenancy / billing / prospect gate — não tocar  

## Desktop / mobile

- `useMediaMd` 768px: lista fullscreen → chat fullscreen no mobile  
- Mesmos campos no item; só padding `sm:*`  
- Aside ~260–300px (doc `INBOX_UI.md` com 360px está desatualizado)

## Riscos do slice visual

| Risco | Mitigação |
|---|---|
| CI quebra em `pending-inbound-badge` | Manter ou atualizar teste no mesmo PR |
| E2E por nome do botão | Manter título acessível |
| Remover Assumir/Fechar | Fora de “só visual” — preservar na fatia 1 |
| Perda de scan sem abrir | Manter um sinal claro de awaiting_agent + assignee |

## Escopo seguro fatia 1

Diff mínimo em `ConversationItem.tsx` (+ tokens CSS se preciso).  
Não alterar `ConversationsList` filters/mutations/grouping, APIs, Prisma, middleware.

## Próximas fases

2. **Proposta visual** — estados: awaiting_agent, awaiting_customer, closed, sem dono; desktop + mobile  
3. **Implementação** — PR isolada só da lista  
4. **Evidência** — before/after + gate KEEP / ITERATE / ROLLBACK  

Estado deste doc: **Fase 1 completa**.  
Proposta canónica Fatia 1: [inbox-conversation-list-visual-proposal-2026-07-28.md](./inbox-conversation-list-visual-proposal-2026-07-28.md)  
Rascunho anterior (complementar): [inbox-list-row-phase2-proposal-2026-07-28.md](./inbox-list-row-phase2-proposal-2026-07-28.md)
