# Port da inbox para `whatsapp-platform` (multi-tenant)

## 1. Comparação: site raiz vs platform

| Aspecto | Site DevFlow Labs (raiz) | `apps/whatsapp-platform` |
|---------|--------------------------|----------------------------|
| Banco | PostgreSQL principal do site | `WHATSAPP_DATABASE_URL` (Prisma) + Supabase operacional |
| Tenant | Single-tenant / interno | **Multi-tenant** (`whatsapp_tenants`) |
| Webhook | `/api/webhook/whatsapp` | `/api/webhooks/whatsapp` |
| Resolução de tenant | N/A | `phone_number_id` → tenant (Supabase + fallback `env`) |
| Inbox antes | `WhatsappConversation` / `WhatsappInboxMessage` (Prisma site) | Supabase `conversations`/`messages` (filas) + **novo** `wa_inbox_*` (Prisma) |

## 2. Decisão de arquitetura

- **Não** reutilizar o banco do site.
- **Não** substituir de imediato as tabelas Supabase de fila/atendimento.
- **Adicionar** camada **Wa Inbox** no Prisma da platform: espelho Cloud API (threads + mensagens + histórico de status), **isolada por `tenant_id`**.
- **Unicidade**: `@@unique([tenantId, waMessageId])` — o mesmo wamid pode existir em tenants diferentes sem colisão.
- **Tenant no webhook**: já resolvido por `resolveTenantByPhoneNumberId(metadata.phone_number_id)`; inbox só persiste se `tenant.id` existir na tabela Prisma `whatsapp_tenants` (tenant virtual `env` **não** grava inbox).
- **Cliente Prisma dedicado**: `src/generated/prisma-whatsapp` para não sobrescrever o `@prisma/client` do monorepo raiz.

## 3. Modelagem

- **`wa_inbox_threads`**: uma thread por `(tenant_id, phone_number)` do cliente.
- **`wa_inbox_messages`**: inbound/outbound, `raw_payload`, tipos Meta, status atual.
- **`wa_inbox_status_history`**: cada transição (received, sent, delivered, read, failed).

## 4. Fluxos

### Inbound / status

1. POST webhook → `persistWaInboxFromWebhook(tenantId, body)`.
2. Parser extrai mensagens (exceto `smb_message_echoes`) e statuses.
3. Ordem: todos os inbound, depois todos os status.
4. Dedup: `findUnique` em `(tenantId, waMessageId)` antes de insert.

### Outbound

- `sendReplyAndPersist` e ramo sem Supabase em `webhookProcessingService` chamam `waInboxCreateOutbound` após `sendText` bem-sucedido.

## 5. Rotas (JWT cookie — mesmo auth de `/api/faq`)

| Rota | Descrição |
|------|-----------|
| `GET /api/inbox/conversations?limit=&offset=` | Threads do tenant |
| `GET /api/inbox/conversations/:id` | Detalhe da thread |
| `GET /api/inbox/conversations/:id/messages?limit=&offset=` | Timeline ASC |
| `GET /api/inbox/health` | `tenantResolutionOk`, `persistenceOk`, `messagesStored`, `lastMessageStoredAt`, `blockedReason` |
| `POST /api/inbox/conversations/:id/send` | `{ text }` — envio manual operador (UI Inbox) |

## 6. Migração

```bash
cd apps/whatsapp-platform
pnpm exec prisma generate
pnpm exec prisma migrate deploy   # ou migrate dev
```

SQL: `prisma/migrations/20260317120000_wa_inbox_multi_tenant/migration.sql`.

**Backfill:** não há — inbox começa vazia após migrate.

**Validação:** aplicar em staging; enviar mensagem de teste por tenant; conferir `wa_inbox_messages` por `tenant_id`.

## 7. Testes

```bash
cd apps/whatsapp-platform && pnpm test
```

Inclui `waInboxWebhookParser.test.ts` (parser + skip echo).

## 8. Próximos passos (UI)

- Tela inbox consumindo `/api/inbox/*`.
- Ação “marcar como lida” (`unreadCount`).
- Alinhar visualmente thread Wa Inbox com conversa Supabase (opcional: link por `phone_number` ↔ `wa_from`).

## 9. Checklist

- [x] Models `WaInboxThread`, `WaInboxMessage`, `WaInboxStatusHistory`
- [x] Migration SQL
- [x] Tenant resolution integrada (existente + existência Prisma)
- [x] Inbound persistido (webhook)
- [x] Outbound persistido (send)
- [x] Status persistido (webhook)
- [x] Rotas `/api/inbox/*`
- [x] Isolamento por `tenantId` nas queries
- [x] Testes parser
- [x] Documentação
