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
- **Claim** só se unassigned (CAS); **transferência/liberação** autorizadas (owner / manager / platform_admin); ver `CONVERSATION_OWNERSHIP_AND_HANDOFF.md`.
- **CLOSED conserva owner**; inbound reopen (`CLOSED→OPEN`) também conserva. Enquanto assigned, IA automática bloqueada pelos guards atuais.
- Liberar (`null`) torna a conversa elegível para IA de novo. `userId: auto` na automação ainda **não** está configurado.

## Filtros da lista (fase)

- **Geral:** todas as threads (refinável por linha/fila/prioridade).
- **Sem responsável:** sem humano atribuído **e** com inbound por responder (fila para assumir).
- **Aguardando cliente:** sem humano, sem pendência inbound.
- **Minhas conversas:** `assignedToUserId = eu` — inclui threads fechadas com o mesmo owner (ownership preservado).
- Ver código: `WaInboxConversationPhaseFilter` em `waInboxQueries.ts`.

## Transições principais

1. **Inbound** → cria/atualiza thread; pode incrementar `unansweredInboundCount`.
2. **`CLOSED` + inbound → `OPEN`** — reabertura automática via `updateThreadStatus` (métrica, audit com `previousStatus`/`status`, realtime, automação). Se a thread já está `OPEN`, a transição é no-op (sem side effects). **Conserva `assignedToUserId`.**
3. **Outbound** (humano/IA/automação) → reduz pendência; atualiza preview e eventual `leadScore`.
4. **Assumir (claim)** → `assignThread` só se unassigned; conflito **409** se outro owner (CAS).
5. **Transferir** → `assignThread` com autorização; CAS em `previousAssigneeId`.
6. **Liberar** → `assignedToUserId = null` (autorizado); no-op se já null.
7. **Fechar / Reabrir (manual)** → `POST /api/inbox/conversations/:id/status` com `OPEN` | `PENDING` | `CLOSED`. **Não** limpa ownership. Transição para o status já corrente é idempotente. Ownership em `CLOSED` não é alterável via assign API.

## Consistência

- Ordenação da lista: ver `waInboxListThreads` (bucket por estado + SLA).
- Não existe estado fantasma persistido como “IA owner”: a UX traduz `lastResponderType` + `conversationState`.
- Enquanto `status = CLOSED`, `conversationState` derivado permanece `closed`; por isso o inbound deve reabrir para a conversa voltar aos filtros operacionais — com o mesmo responsável humano.
