# Inbox Collaboration — Presença, Viewers, Typing e Auditoria

Documentação do sistema colaborativo de atendimento em equipe da inbox WhatsApp Platform.

## Visão geral

O sprint de colaboração adiciona:

- **Presença** — usuários online por tenant
- **Viewers** — quem está visualizando cada conversa
- **Typing indicator** — “fulano está digitando”
- **Auditoria** — histórico de ações (assign, status, tags, mensagens)

## Arquitetura

```
┌─────────────────────────────────────────────────────────────────────┐
│  Cliente (React)                                                    │
│  - useInboxRealtime (SSE)                                           │
│  - reportViewing(threadId, true|false)                              │
│  - reportTyping(threadId, true|false)                               │
└─────────────────────────────────────────────────────────────────────┘
         │                    │                    │
         │ SSE                │ POST /view         │ POST /typing
         ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│  API                                                                │
│  GET /api/realtime/stream  │  POST .../view  │  POST .../typing     │
└─────────────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│  presence.service + presence.store (in-memory)                      │
│  - setOnline / setOffline (conecta/desconecta SSE)                  │
│  - joinThread / leaveThread (viewers)                               │
│  - setTyping (typing)                                               │
└─────────────────────────────────────────────────────────────────────┘
         │
         ▼ publish(tenantId, event)
┌─────────────────────────────────────────────────────────────────────┐
│  realtime.publisher → SSE → clientes                                │
└─────────────────────────────────────────────────────────────────────┘
```

## Presença (Online users)

### Backend

- **Store:** `presence.store.ts` — Map in-memory por tenant, TTL 60s
- **Service:** `presence.service.ts` — `setOnline`, `setOffline`, `heartbeat`, `getOnline`

### Fluxo

1. Usuário conecta no SSE → `setOnline(tenantId, userId, userInfo)`
2. A cada ping (30s) → `heartbeat(tenantId, userId)`
3. Desconexão → `setOffline(tenantId, userId)`
4. TTL 60s sem heartbeat → usuário removido do mapa (cleanup automático)

### Evento

- `presence.updated` — payload: `{ userId, tenantId, status: "online"|"offline", user? }`

### API

- `GET /api/inbox/presence` — retorna usuários online do tenant

## Viewers (Quem está na conversa)

### Lógica

- Ao abrir uma conversa → `POST .../view` com `{ viewing: true }`
- Ao fechar/sair → `POST .../view` com `{ viewing: false }`
- TTL 90s sem heartbeat (futuro: podemos adicionar heartbeat no view)

### Eventos

- `conversation.viewer_joined` — payload: `{ threadId, tenantId, userId, user? }`
- `conversation.viewer_left` — payload: `{ threadId, tenantId, userId }`

### API

- `POST /api/inbox/conversations/:id/view` — body: `{ viewing: boolean }`

## Typing indicator

### Lógica

- Ao digitar → após debounce 400ms, `POST .../typing` com `{ typing: true }`
- Ao parar de digitar → após 1,5s, `typing: false`
- TTL 5s no servidor — typing expira automaticamente

### Eventos

- `typing.start` — payload: `{ threadId, tenantId, userId, user? }`
- `typing.stop` — payload: `{ threadId, tenantId, userId }`

### API

- `POST /api/inbox/conversations/:id/typing` — body: `{ typing: boolean }`

## Auditoria

### Modelo (Prisma)

```prisma
model WaInboxAuditLog {
  id        String   @id @default(cuid())
  tenantId  String
  threadId  String
  userId    String   // quem fez a ação
  action    String   // assign, unassign, status_change, tag_add, tag_remove, message_send, priority_change, ai_reply
  metadata  Json?
  createdAt DateTime
}
```

### Ações auditadas

| Ação           | Quando                         |
|----------------|--------------------------------|
| assign         | Claim/transferência (metadata: `previousAssigneeId`, `assignedToUserId`) |
| unassign       | Liberação (metadata: `previousAssigneeId`, `assignedToUserId: null`) |
| status_change  | Alterar status (OPEN/PENDING/CLOSED) |
| tag_add        | Adicionar tag                  |
| tag_remove     | Remover tag                    |
| message_send   | Enviar mensagem                |
| priority_change| Alterar prioridade (quando existir) |
| ai_reply       | IA respondeu (opcional)        |

### API

- `GET /api/inbox/conversations/:id/audit` — retorna histórico da conversa

## Eventos realtime (expandidos)

| Evento                     | Descrição                    |
|----------------------------|------------------------------|
| presence.updated           | Usuário online/offline       |
| conversation.viewer_joined | Usuário entrou na conversa   |
| conversation.viewer_left   | Usuário saiu da conversa     |
| typing.start               | Usuário começou a digitar    |
| typing.stop                | Usuário parou de digitar     |

## Multi-tenant

- Presença, viewers e typing são isolados por tenant
- `tenantId` vem do JWT; nunca é aceito do cliente
- Usuário autenticado só acessa dados do próprio tenant

## UI

### Sidebar

- Badge com contador de operadores online (bolinha verde)
- Tooltip com nomes

### Chat Header

- “Atendido por: X”
- “Visualizando: João, Maria”
- Botão “Histórico” para abrir aba de auditoria

### Message Input

- “Fulano está digitando…” (quando outro usuário digita)

### Aba Histórico

- Lista de ações: “João atribuiu para Maria”, “Maria mudou status para FECHADO”, etc.

## Segurança

- Autenticação obrigatória em todas as rotas
- `userId` vem do JWT; não permite spoof
- Validação de tenant em todas as operações

## Performance

- Store in-memory (Redis-ready para múltiplas instâncias)
- TTL para limpar dados expirados
- Debounce no typing para evitar flood
- Presença não persistida em banco

## Setup

### Migração do banco

Execute a migração para criar a tabela de auditoria:

```bash
cd apps/whatsapp-platform
pnpm exec prisma migrate dev --name add_wa_inbox_audit_log
```

Ou aplique manualmente o SQL em `prisma/migrations/20260321120000_wa_inbox_audit_log/migration.sql`.

## Troubleshooting

### Usuários não aparecem online
- Verificar se o SSE está conectado (indicador “Tempo real” no header)
- Conferir se `setOnline` é chamado ao conectar
- Verificar TTL (60s) — sem heartbeat o usuário é removido

### Typing não aparece
- Verificar debounce (400ms) — pode haver delay
- TTL 5s — typing some automaticamente
- Verificar se `reportTyping` é chamado e se o evento chega

### Audit log vazio
- Verificar se as ações estão integradas com `logAction`
- Conferir migração do banco (`wa_inbox_audit_logs`)
