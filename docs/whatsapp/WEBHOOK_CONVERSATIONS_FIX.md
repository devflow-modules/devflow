# Correção: `Could not find the table 'public.conversations' in the schema cache`

## Contexto

O webhook recebe mensagens corretamente, mas falha em `prepareInboundConversation` com:

```
conversations.insert: Could not find the table 'public.conversations' in the schema cache
```

## Causa raiz

O `conversationsRepository` usa o cliente Supabase (PostgREST) e insere em `public.conversations`. Essa tabela é definida em `supabase/schema.sql`, mas **não havia migration Prisma** aplicada ao banco — apenas `whatsapp_conversations` (Prisma) existia.

## Correções aplicadas

### 1. Fallback de produção (webhookProcessingService.ts)

Se `findOrCreateConversation` ou `insertMessage` falharem com erro de "tabela não encontrada", o código:

- loga o aviso
- retorna `{ conversationId: "no-db", textBody }`
- o bot continua e envia a resposta (sem persistir em Supabase)

### 2. Migration Prisma

`20260327000000_supabase_conversations_messages` cria:

- `public.conversations` (tenant_id text, wa_from, status, etc.)
- `public.messages` (conversation_id, direction, body, etc.)

Compatível com `conversationsRepository` e `messagesRepository`.

## Aplicar a migration

```bash
cd apps/whatsapp-platform
pnpm prisma migrate deploy
```

Ou em dev:

```bash
pnpm prisma migrate dev --name supabase_conversations_messages
```

**Nota:** Após a migration, o PostgREST/Supabase pode levar alguns segundos para atualizar o schema cache. Se o erro persistir, reinicie o projeto ou aguarde ~30s.

## Checklist de validação

1. [ ] Rodar `pnpm prisma migrate deploy` no projeto whatsapp-platform
2. [ ] Deploy da aplicação (Vercel)
3. [ ] Enviar mensagem real para o número da DevFlow
4. [ ] Verificar logs: `POST received` → `normalized` → `processing text message` → `legacy reply sent successfully` (ou equivalente)
5. [ ] Confirmar que o bot responde
6. [ ] Se ainda aparecer "table not found", conferir se `WHATSAPP_SUPABASE_URL` e `WHATSAPP_DATABASE_URL` apontam para o mesmo projeto Supabase
