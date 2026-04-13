# Inbox — ciclo de vida da conversa (thread)

Fonte de verdade: `wa_inbox_threads` + mensagens em `wa_inbox_messages`.  
Estados derivados: `src/modules/inbox/waInboxConversationState.ts` e filtros em `waInboxQueries.ts`.

**Atribuição, posse e handoff (terminologia e rotas):** `docs/architecture/CONVERSATION_OWNERSHIP_AND_HANDOFF.md`.

## Estados lógicos (UI / API)

| Estado | Condição resumida |
|--------|-------------------|
| **Precisa de resposta** (`awaiting_agent`) | Há mensagem inbound após o último outbound (pendência real). |
| **Em atendimento** (`in_progress`) | `assignedToUserId` preenchido e sem pendência inbound (ou conforme rank). |
| **Aguardando cliente** (`awaiting_customer`) | Sem responsável humano, sem inbound pendente — última palavra foi do negócio (humano, IA ou automação). |
| **Fechada** (`closed`) | `status = CLOSED`. |

## Atribuição (ownership)

- **Humano:** `assignedToUserId` → aparece como responsável no cabeçalho.
- **IA / automação:** não preenchem `assignedToUserId`; a “posse” é inferida pelo último outbound (`lastResponderType`: `ai`, `automation`, agente).

## Filtros da lista (fase)

- **Geral:** todas as threads (refinável por linha/fila/prioridade).
- **Sem responsável:** sem humano atribuído **e** com inbound por responder (fila para assumir).
- **Aguardando cliente:** sem humano, sem pendência inbound.
- Ver código: `WaInboxConversationPhaseFilter` em `waInboxQueries.ts`.

## Transições principais

1. **Inbound** → cria/atualiza thread; pode incrementar `unansweredInboundCount`.
2. **Outbound** (humano/IA/automação) → reduz pendência; atualiza preview e eventual `leadScore`.
3. **Assumir** → `assignThread` preenche `assignedToUserId` (IA automática pode ser suprimida se política exigir humano).
4. **Liberar** → `assignedToUserId = null`.
5. **Fechar / Reabrir** → `status` OPEN/PENDING/CLOSED`.

## Consistência

- Ordenação da lista: ver `waInboxListThreads` (bucket por estado + SLA).
- Não existe estado fantasma persistido como “IA owner”: a UX traduz `lastResponderType` + `conversationState`.
