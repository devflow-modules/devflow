# Inbox UI — WhatsApp Platform

## Arquitetura frontend

| Caminho | Papel |
|---------|--------|
| `app/(protected)/layout.tsx` | `QueryProvider` (TanStack Query) |
| `app/(protected)/inbox/page.tsx` | Página `/inbox` |
| `components/inbox/InboxShell.tsx` | Layout lista + chat, responsivo |
| `components/inbox/ConversationsList.tsx` | Lista + polling 10s |
| `components/inbox/ConversationItem.tsx` | Item com unread + preview |
| `components/inbox/ChatWindow.tsx` | Header + mensagens + input |
| `components/inbox/MessageList.tsx` | Timeline ASC, polling 3s, agrupamento por data |
| `components/inbox/MessageBubble.tsx` | Inbound/outbound + status (✓ / ✓✓ / !) |
| `components/inbox/MessageInput.tsx` | Envio otimista + retry |
| `middleware.ts` | `/inbox` exige JWT (cookie `whatsapp_platform_token`) → redirect `/login` |

## Fluxo de dados

1. **Conversas:** `GET /api/inbox/conversations` — credenciais cookie; tenant vem do JWT no servidor.
2. **Mensagens:** `GET /api/inbox/conversations/:threadId/messages`
3. **Envio:** `POST /api/inbox/conversations/:threadId/send` — body `{ text }` (rota dedicada ao thread Wa Inbox, usa token/número do tenant no Prisma).

Nenhum `tenantId` no frontend — apenas sessão autenticada.

## Polling

- Lista: **10s**
- Mensagens (conversa aberta): **3s**

## UX

- Desktop: sidebar 360px + chat.
- Mobile: lista fullscreen → ao abrir conversa, chat fullscreen com “← voltar”.
- Outbound: fundo verde claro; inbound: cinza.
- Fundo do chat: padrão sutil (SVG).
- Envio otimista + invalidação; erro com “Tentar novamente”.

## Testes

`pnpm test` — `src/components/inbox/__tests__/inboxUi.test.tsx` (jsdom): lista, seleção, mensagens, loading, status no bubble.

## Próximos passos

- WebSocket / SSE para tempo real.
- Marcar como lida (API + badge).
- Anexos / mídia.
- Atalhos teclado, busca na lista.

## Checklist

- [x] Página `/inbox` protegida
- [x] Lista + chat + envio + polling + status visual
- [x] Responsivo
- [x] Testes
- [x] Documentação
