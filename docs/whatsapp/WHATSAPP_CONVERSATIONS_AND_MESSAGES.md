# WhatsApp Inbox — conversas e mensagens persistidas

## Objetivo

Backend pronto para **inbox estilo WhatsApp**: toda mensagem inbound/outbound e atualizações de status ficam no PostgreSQL, agrupadas por conversa (1 conversa por número do cliente no MVP).

## Arquitetura

```
Webhook POST → persistWebhookEvents → createInboundMessage / updateMessageStatusFromWebhook
sendTextMessage / sendWhatsAppMessage → createOutboundMessage (após sucesso na Meta)
Admin API → listConversations / getConversation / listMessages
```

| Módulo | Papel |
|--------|--------|
| `src/modules/whatsapp-inbox/` | Serviços de conversa, mensagem, persistência do webhook, health de contagem |
| `prisma/schema.prisma` | `WhatsappConversation`, `WhatsappInboxMessage`, `WhatsappMessageStatusHistory` |
| `src/app/api/admin/conversations/*` | Listagem e detalhe para UI |

## Modelagem (Prisma)

### WhatsappConversation

- `id` (UUID), `phoneNumber` (único — cliente), `contactName`, `lastMessageAt`, `unreadCount`, `lastMessagePreview`, `status` (`OPEN` \| `CLOSED` \| `PENDING`).
- Uma linha por número (MVP).

### WhatsappInboxMessage

- `waMessageId` único (wamid da Meta) — **deduplicação** de retries do webhook.
- `direction`: `INBOUND` \| `OUTBOUND`.
- `messageType`: `TEXT`, `IMAGE`, `AUDIO`, `DOCUMENT`, `UNKNOWN`.
- `contentText` / `contentJson`, `status` (`RECEIVED`, `SENT`, `DELIVERED`, `READ`, `FAILED`), `rawPayload`.
- Índices: `waMessageId`, `(conversationId, ts)`.

### WhatsappMessageStatusHistory

- Cada mudança de status (webhook ou marco inbound) gera um registro ligado à mensagem.

## Fluxo inbound

1. Webhook recebe `messages` (campo `messages`, não `smb_message_echoes`).
2. `findOrCreateConversationForInbound` — cria conversa ou incrementa `unreadCount` + atualiza preview.
3. Se `waMessageId` já existir → **no-op** (evita duplicar em retry).
4. Mensagem com `status: RECEIVED` + histórico.

## Fluxo outbound

1. Após `200` da Meta (`messages[0].id`), `createOutboundMessage`.
2. `touchConversationAfterOutbound` (sem incrementar unread).
3. `status: SENT` + histórico.
4. Cobre **send-text admin** e **respostas do bot** (`sendWhatsAppMessage`).

## Fluxo de status (webhook)

Payload `statuses[]`: `sent` → `SENT`, `delivered` → `DELIVERED`, `read` → `READ`, `failed` → `FAILED`.

- Busca mensagem por `waMessageId`.
- Atualiza `WhatsappInboxMessage.status` + insere linha em `WhatsappMessageStatusHistory`.

## Migração

```bash
pnpm exec prisma migrate deploy
# ou em dev:
pnpm exec prisma migrate dev
```

Migration: `20260318193000_whatsapp_inbox_conversations`.

## Variáveis úteis

| Env | Uso |
|-----|-----|
| `WHATSAPP_BUSINESS_E164` | Número da empresa (from em outbound / to em inbound se sem `display_phone_number`) |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Fallback do número público do site |

## API Admin (header `x-admin-whatsapp-secret`)

### `GET /api/admin/conversations`

Query: `limit` (default 50, max 200), `offset`.

**Resposta (exemplo):**

```json
{
  "success": true,
  "data": {
    "conversations": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "phoneNumber": "5511999999999",
        "contactName": "Maria",
        "lastMessageAt": "2025-03-17T15:00:00.000Z",
        "unreadCount": 2,
        "lastMessagePreview": "Olá",
        "status": "OPEN",
        "createdAt": "...",
        "updatedAt": "..."
      }
    ],
    "pagination": { "limit": 50, "offset": 0, "total": 1 }
  }
}
```

### `GET /api/admin/conversations/:id`

`id` = UUID da conversa.

### `GET /api/admin/conversations/:id/messages`

Query: `limit` (max 500), `offset`. Ordem **ASC** por `ts` (timeline).

```json
{
  "success": true,
  "data": {
    "conversationId": "550e8400-...",
    "messages": [
      {
        "id": "...",
        "waMessageId": "wamid.HBgM...",
        "direction": "INBOUND",
        "fromNumber": "5511999999999",
        "toNumber": "5513888888888",
        "messageType": "TEXT",
        "contentText": "Oi",
        "status": "RECEIVED",
        "ts": "2025-03-17T15:00:01.000Z",
        "rawPayload": {}
      }
    ],
    "pagination": { "limit": 100, "offset": 0 }
  }
}
```

## Health (messaging)

`GET /api/admin/whatsapp/messages/health` inclui:

- `persistenceOk` — DB acessível e tabela consultável  
- `messagesStored` — total de linhas em `WhatsappInboxMessage`  
- `lastMessageStoredAt` — ISO do último `createdAt`

## Logs (sem PII completa)

- `whatsapp_inbox` / `inbound_persisted`, `outbound_persisted`, `status_applied`, `status_no_message`

## Testes

```bash
pnpm exec vitest run src/modules/whatsapp-inbox
```

## Próximos passos (UI inbox)

- Marcar conversa como lida (`PATCH` + `unreadCount: 0`).
- Paginação cursor-based em mensagens longas.
- Upload de mídia e preview.
- Filtros por status de conversa e busca por telefone.
