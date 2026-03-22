# Inbox Realtime — SSE

Documentação da arquitetura e uso de atualizações em tempo real da inbox WhatsApp Platform.

## Decisão técnica: SSE (Server-Sent Events)

A abordagem escolhida foi **SSE** em vez de WebSocket, pelos seguintes motivos:

1. **Fluxo unidirecional** — A inbox precisa apenas server → client. SSE é ideal para push de eventos.
2. **Simplicidade** — Sem handshake complexo, sem reconexão customizada. O browser trata nativamente.
3. **Compatibilidade** — Funciona bem com HTTP/1.1, proxies e Next.js App Router.
4. **Autenticação** — Cookie JWT enviado automaticamente em requisições same-origin.
5. **Menor superfície de erro** — WebSocket exigiria mais código de reconexão e fallback.

WebSocket seria justificável se houvesse necessidade de envio frequente client → server (ex.: typing indicators em alta frequência). Para o cenário atual (atualizações de conversas e mensagens), SSE é suficiente.

## Arquitetura

```
┌─────────────────┐     SSE GET /api/realtime/stream      ┌─────────────────┐
│  Browser        │◄──────────────────────────────────────│  Next.js        │
│  EventSource    │   data: { type, payload, ... }        │  Route Handler  │
│  useInboxRealtime│                                      │  subscribe()    │
└────────┬────────┘                                      └────────┬────────┘
         │                                                         │
         │ React Query cache update                                │
         ▼                                                         │
┌─────────────────┐                                      ┌────────▼────────┐
│  InboxShell     │                                      │  realtime.      │
│  Conversations  │                                      │  publisher      │
│  ChatWindow     │                                      │  (in-memory)    │
└─────────────────┘                                      └────────┬────────┘
                                                                  │
                                              publish(tenantId, event)
                                                                  │
                                                                  ▼
                                              ┌─────────────────────────────┐
                                              │  waInboxCreateInbound       │
                                              │  waInboxCreateOutbound      │
                                              │  waInboxApplyStatus         │
                                              │  assignThread / unassign    │
                                              │  updateThreadStatus         │
                                              │  assignTag / removeTag      │
                                              └─────────────────────────────┘
```

## Fluxo de publicação / consumo

1. **Persistência** — Um serviço (ex.: `waInboxCreateInbound`) persiste dados no banco.
2. **Publicação** — Após sucesso, chama `publishInboxEvent(tenantId, event)`.
3. **Publisher** — O publisher in-memory notifica todos os subscribers do `tenantId`.
4. **SSE** — A rota `/api/realtime/stream` tem um subscriber que envia o evento ao cliente.
5. **Cliente** — `EventSource` recebe o evento e `useInboxRealtime` processa.
6. **React Query** — O hook atualiza o cache (patch ou invalidation) conforme o tipo de evento.

## Autenticação e isolamento por tenant

- A rota SSE exige autenticação via cookie JWT (`getAuthFromRequest`).
- O `tenantId` vem do JWT. O cliente **nunca** envia `tenantId` no request.
- O stream envia **apenas** eventos do tenant do usuário autenticado.
- Não é possível subscrever a outro tenant. Isolamento garantido no backend.

## Eventos suportados

| Evento | Payload | Ação no cliente |
|--------|---------|-----------------|
| `conversation.created` | `{ thread }` | Invalida lista de conversas |
| `conversation.updated` | `{ threadId, patch }` | Patch no cache de conversas |
| `conversation.assigned` | `{ threadId, assignedToUserId, assignedToUser }` | Patch no cache |
| `conversation.status_changed` | `{ threadId, status }` | Patch no cache |
| `conversation.tags_changed` | `{ threadId, tags }` | Patch no cache |
| `conversation.priority_changed` | `{ threadId, priority }` | Patch no cache |
| `message.created` | `{ threadId, message, threadPatch? }` | Append em messages; patch em conversations |
| `message.status_updated` | `{ threadId, messageId, status }` | Patch no cache de messages |

## Fallback e reconexão

- Se o SSE falhar ou desconectar, o cliente tenta reconectar com backoff (2s → 30s max).
- Enquanto desconectado, a UI usa **polling** (5s) como fallback.
- Com realtime conectado, o polling é reduzido (10s) para evitar duplicação de requisições.
- O header da inbox exibe um indicador: "Tempo real" (verde) ou "Polling" (âmbar).

## Pontos de publicação

| Serviço | Função | Evento(s) |
|---------|--------|-----------|
| `waInboxMessageService` | `waInboxCreateInbound` | `message.created` |
| `waInboxMessageService` | `waInboxCreateOutbound` | `message.created` |
| `waInboxMessageService` | `waInboxApplyStatus` | `message.status_updated` |
| `threadAssignmentService` | `assignThread`, `unassignThread` | `conversation.assigned` |
| `threadStatusService` | `updateThreadStatus` | `conversation.status_changed` |
| `tagService` | `assignTagToThread`, `removeTagFromThread` | `conversation.tags_changed` |

**Prioridade:** O evento `conversation.priority_changed` está definido no contrato. Quando houver API para alterar prioridade da thread, integrar `eventConversationPriorityChanged` no serviço correspondente.

## Múltiplas instâncias (escala horizontal)

O publisher atual é **in-memory por processo**. Em deployment com múltiplas instâncias:

- Um evento publicado na instância A **não** chega a clientes conectados na instância B.
- Solução: usar um message broker (ex.: Redis Pub/Sub) em vez do Map in-memory.
- O contrato (`subscribe`, `publish`) permite trocar a implementação sem alterar os consumidores.

## Troubleshooting

### Cliente não recebe eventos
- Verificar se o cookie JWT está presente (login na plataforma).
- Conferir no DevTools (Network) se a requisição GET `/api/realtime/stream` retorna 200 e mantém conexão.
- Verificar se o evento está sendo publicado no tenant correto.

### Eventos duplicados
- O publisher notifica todos os subscribers do tenant. Se o mesmo usuário tiver múltiplas abas, todas recebem. Comportamento esperado.
- Evitar publicar o mesmo evento mais de uma vez no mesmo fluxo (ex.: após retry de persistência).

### Reconexão infinita
- Se o servidor retornar 401/403, o EventSource dispara `onerror` e tenta reconectar. Verificar autenticação.
- Se houver problema de rede prolongado, o backoff alcança 30s. Após reconexão bem-sucedida, o delay volta a 2s.
