# Mensagens WhatsApp — fonte canónica (runtime)

## Modelo canónico (Prisma)

Todo o fluxo **principal** de mensagens e fila de distribuição usa:

| Tabela / modelo | Função |
|-----------------|--------|
| `whatsapp_phone_numbers` | Credenciais e linha Meta (`phone_number_id`, token, flags primary/default). |
| `wa_inbox_threads` | Uma thread por `(tenantId, phoneNumber do cliente, businessPhoneNumberId)`; **fila** = threads `OPEN` ou `PENDING` com `assignedToUserId` nulo, ordenadas por `lastMessageAt` ascendente. |
| `wa_inbox_messages` | Mensagens inbound/outbound com `waMessageId`, direção, texto, timestamps. |

Removido do schema Prisma da app (migração `20260402180000_drop_whatsapp_legacy_conversation_models`): `whatsapp_conversations`, `whatsapp_messages`, `whatsapp_conversation_queue`. Não há segundo modelo Prisma de conversa/mensagem.

Pontos de entrada:

- **Webhook**: `persistWaInboxFromWebhook` → threads/mensagens; IA/resposta legada resolve `waInboxThread` pela chave composta.
- **Inbox (app)**: `app/api/inbox/...` e `modules/inbox/`.
- **Envio**: `sendReplyAndPersist` / `sendWebhookAutoReply` + `waInboxCreateOutbound`.
- **IA / automação**: `inboxThreadId` = `wa_inbox_threads.id`.
- **Fila admin**: `GET /api/admin/queue/next` e `GET /api/admin/queues` usam `findNextUnassignedQueueThread` / `listPendingQueueThreads` em `modules/inbox/waInboxQueueService.ts`. A resposta de `queue/next` expõe apenas **`thread`** (sem alias `conversation`).
- **Distribuir** (`/admin/distribuir`): consome `queue/next` e redireciona para `/admin/conversations/:threadId`.
- **Métricas (overview/agents)**: `modules/metrics/metricsService.ts` agrega `wa_inbox_messages` e threads atribuídas (`assignedToUserId`). Intents: vazio (campo não existe na inbox).
- **Pesquisa admin** (`/api/admin/conversations/search`): texto em `wa_inbox_messages.contentText`.
- **Feedback** (`messageFeedback`): `conversationId` guarda **`wa_inbox_threads.id`**; `messageId` = `wa_inbox_messages.id`.
- **Mensagens 24h (ops/admin)**: `modules/messaging/waInboxMessageStats.ts`.

## Deprecado / fora do modelo canónico Prisma

- **Supabase `conversations` / `messages`**: `conversationsRepository` e `messagesRepository` só para export/admin legado que ainda lê Supabase; não alimentar a partir do webhook.
- **`webhook_logs` / `persistWebhookLog`**: opcional, Supabase; fora do hot path do webhook.

## Nomenclatura

- `inboxThreadId` / ids na UI admin de conversas = **`wa_inbox_threads.id`**.
- `AgentStatus.currentConversationId` = id da thread em atendimento (mesmo significado).

## Checklist pós-migração / deploy

1. `cd apps/whatsapp-platform && pnpm exec prisma migrate deploy` (com `WHATSAPP_DIRECT_URL`).
2. Smoke: `pnpm run smoke` (por defeito `http://localhost:3000`; override com `PLATFORM_URL`).
3. Manual: `GET /api/admin/queue/next` → corpo com `thread` (ou `thread: null`); **Distribuir** abre `/admin/conversations/:id` com esse id; **assign** / **resolve** na mesma thread; inbox app; `GET .../search?q=`; `POST .../messages/:id/feedback`; export CSV; `GET /api/metrics/overview`.
4. Confirmar que nenhum código referencia `prisma.conversation`, `prisma.message` ou `conversationQueue`.
