# Fase 1 — Auditoria Inbox · ChatHeader (Fatia 2)

Data: **2026-07-28**  
Branch: `docs/inbox-chat-header-audit`  
Pré-requisito: Fatia 1 lista **KEEP** ([#163](https://github.com/devflow-modules/devflow/pull/163))  
Escopo: **somente leitura** — sem alteração de código

## Decisão de produto (grill)

| Campo | Valor |
|---|---|
| Job do header | Responder: com quem falo · estado · responsável · risco SLA · próxima ação |
| Persona | Agente após selecionar conversa |
| Problema | Controles e metadados concorrentes no mesmo chrome (toolbar densa + chips + menus) |
| Menor experimento | Densificar só `ChatHeader` (+ CSS pontual) |
| Non-goals | Editor, mensagens, `LeadDataPanel`, banner (exceto mapa de repetição), lista |
| Veredito | **go** na fatia 2 (após proposta + aprovação) |

## Inventário de componentes

| Peça | Ficheiro | Papel |
|---|---|---|
| Cabeçalho | `ChatHeader.tsx` | Identidade + estado + assignee + toolbar de ações |
| Janela | `ChatWindow.tsx` | Compõe header + banner + mensagens + notes/audit |
| Banner | `ConversationActionBanner.tsx` | Faixa abaixo do header (HIGH wait / cliente aguarda) |
| Estado UI | `conversationStateUi.tsx` | Badge `conversationState` |
| SLA styles | `inboxOperationalStyles.ts` | Classes SLA |
| Assignee copy | `lib/roleProductLabels` → `inboxAssigneeCopy` | Linha + nota de ownership |
| Status agente | `AgentStatusBadge.tsx` | Estado **do operador logado** (não da thread) |
| Upgrade fila | `FeatureUpgradePrompt` | Bloqueio billing ao mudar fila |
| Fetch | `inboxFetch.ts` | assign, status, tags, queue, users, team |

## Anatomia atual (ordem visual)

1. Voltar (mobile) · Avatar · Título · Telefone · `AgentStatusBadge` (meu status)  
2. Chips: estado operacional · SLA (label + wait) · OPEN/PENDING/CLOSED · Prioridade HIGH  
3. Texto responsável (copy rica / “Sem responsável — …”)  
4. Linha WhatsApp (+ purpose)  
5. Select Fila (+ upgrade prompt)  
6. Toolbar (`chat-header-actions`):  
   - **Assumir** / Liberar / Encerrar / Reabrir  
   - Menu Responsável  
   - Menu Estado (OPEN/PENDING/CLOSED)  
   - Tags (+ adicionar)  
   - Notas · Histórico  

Header scrollável: `max-h` ~34–38vh — sintoma de excesso vertical.

## Handlers e permissões (invariantes)

| Ação | Handler | Gate |
|---|---|---|
| Assumir | `assignConversation(id, "me")` | `canAssume` = unassigned ∧ ¬CLOSED |
| Liberar | `assignConversation(id, null)` | owner ∨ manager/platform_admin |
| Menu assignee | `handleAssign(userId\|null)` | unassigned ∨ owner ∨ manager+ |
| Encerrar / Reabrir / Estado | `updateConversationStatus` | Encerrar se ¬CLOSED; Reabrir se CLOSED |
| Tags | add/remove tag | Sem gate de role no UI (API tenant) |
| Fila | `updateThreadQueue` | Feature gate → upgrade prompt |
| Notas / Histórico | callbacks shell | Props opcionais |

## Repetições

| Sinal | Header | Lista (#163) | Banner | Painel |
|---|---|---|---|---|
| Estado operacional | Badge | Badge | customer_waiting | Badge + hint |
| OPEN/CLOSED chip | Sim + menu Estado | Estilo CLOSED | — | — |
| Assignee | Texto + Assumir/Liberar/menu | Linha assignee | Indireto | Assignee |
| SLA | Label + wait (sempre se wait) | Wait só exceção | Minutos HIGH | — |
| Prioridade HIGH | Chip | Removido da row | `high_wait` | Stripe |
| Linha / fila | Texto + select | Removidos da row | — | — |
| Tags / notas / audit | Toolbar | — | — | Notas/audit tabs |

## Classificação proposta

| Elemento | Classe |
|---|---|
| Identidade (nome) + avatar | **Primário** |
| Telefone | **Primário** (confirma “com quem”) |
| Estado operacional (`conversationState`) | **Primário** |
| Assumir (quando `canAssume`) | **Primário** — ação dominante |
| Encerrar / Reabrir | **Primário** (ciclo de vida; menos frequente que Assumir) |
| Responsável (resumo curto) | **Primário** |
| SLA wait / critical·high | **Excepcional** — alinhar à lista (≥ alerta ou high/critical); low/medium sem wait → omitir chip “SLA OK” |
| Liberar | **Contextual** / secundário (menu responsável) |
| Menu Responsável | **Primário** como controlo; trigger compacto |
| Chip OPEN/PENDING/CLOSED | **Redundante** com menu Estado + badge operacional — demotar ao menu |
| Menu Estado | **Contextual** (agrupar em “Mais” ou manter um trigger) |
| Prioridade HIGH | **Redundante** com banner — demotar |
| Linha WhatsApp | **Contextual** |
| Select Fila | **Contextual** |
| Tags | **Contextual** — menu “Mais” / painel |
| Notas / Histórico | **Contextual** — menu “Mais” |
| `AgentStatusBadge` (meu status) | **Contextual** — fora do job da conversa; candidato a chrome de shell, não do header da thread |
| Copy longa assignee + note | **Redundante** — encurtar; detalhe no painel |
| Voltar mobile | **Primário** (navegação) |

### BLOCKED_BY_PRODUCT_DECISION

1. Remover `AgentStatusBadge` do header vs mover para shell.  
2. Fila sempre visível (operadores que mudam fila o tempo todo) vs só em “Mais”.  
3. SLA no header: espelhar exceção da lista **ou** mostrar wait sempre em `awaiting_agent` (mais conservador para a conversa aberta).

## Anatomia alvo (rascunho)

```
[←] [AV] Nome                          [Assumir*]
         telefone
         ○ Estado · [SLA se exceção] · Responsável curto
         ─────────────────────────────
         [Encerrar|Reabrir] [Responsável ▾] [Mais ▾]
```

`Mais` → Estado thread · Tags · Notas · Histórico · Linha · Fila.

## Invariantes de teste

- `chat-header`, `header-assume`, `header-release`, `header-close`, `header-reopen`  
- `header-assignee-menu` / `header-assignee-readonly` / `header-assign-me` / `header-unassign`  
- `header-status-error`, `header-assign-error`, `header-thread-status-trigger`  
- `chat-header-sla`, `chat-header-state-badge`, `chat-header-assignee`, `chat-thread-tags`, `header-notes`  
- `header-my-agent-status` (se o badge permanecer no header)  
- Histórico: **sem testid hoje** — adicionar na implementação se o trigger mudar de sítio  
- Suites: `ChatHeader.assignment.test.tsx`, `ChatHeader.status.test.tsx`, `inboxUi.test.tsx` (tags/SLA)  
- E2E: assume→release, status PENDING, close→reopen, `chat-header-state-badge`  

Auditoria complementar (explore): [Audit ChatHeader inbox slice](1c983eb8-7f1f-4935-acda-3c4e4eac8f49).

## Desktop / mobile

- `showBack` + `md:hidden` (`InboxShell`: `showBack={!isMd}`)  
- `compactChrome` via foco / sidebar colapsada — reduz padding/avatar/max-h  
- Header `max-h` + `overflow-y-auto` — sintoma de densidade; toolbar larga empurra o chat  

## Riscos

| Risco | Mitigação |
|---|---|
| Esconder Encerrar | Manter botão visível (não só em Mais) |
| Partir permissões assignee | Não alterar `canAssume` / `canRelease` / `canChangeAssignee` |
| Quebrar e2e por copy “Assumir conversa” | Preservar testid; copy pode encurtar |
| Fila/billing | Manter `FeatureUpgradePrompt` no fluxo de fila |
| Banner + header SLA/HIGH | Densificar header **sem** tocar banner nesta fatia; SLA/HIGH só como exceção no header para não empilhar com `ConversationActionBanner` |
| Assumir deixa de ser dominante | Primary + ring se `awaiting_agent`; nunca só dentro de Mais |

## Escopo seguro Fatia 2

Diff em `ChatHeader.tsx` (+ tokens CSS header se preciso + testes do header).  
Não tocar `MessageInput`, `MessageList`, `LeadDataPanel`, `ConversationItem`.

## Próximo

Proposta visual documentada → aprovação humana → implementação isolada → gate → KEEP/ITERATE/ROLLBACK/BLOCK.
