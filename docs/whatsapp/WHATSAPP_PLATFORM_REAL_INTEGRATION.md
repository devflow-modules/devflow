# WhatsApp Platform — Real integration summary

## O que foi portado

- **Webhook (root `src/`):** GET (verificação hub.verify_token) e POST (entry/changes/messages) → lógica movida para `apps/whatsapp-platform`.
- **Handler de mensagem:** `handleIncomingMessage` → `webhookProcessingService.processInboundMessage` + `ruleBasedReplies.getReplyForMessage`.
- **Parser de intent:** `parseMessage` (keyword-based) → `modules/ai/ruleBasedReplies.ts`.
- **Mensagens fixas:** `MESSAGES` (welcome, menu, option1/2/3, fallback, demo) → `modules/ai/ruleBasedReplies.ts`.
- **Envio:** `sendWhatsAppMessage` → `WhatsAppCloudAdapter` (whatsapp-core) + `sendReplyAndPersist` em `modules/messaging`.

## O que ficou nos packages

- **@devflow/whatsapp-core:** normalização de payload (`normalizeWebhookPayload`), tipos, `WhatsAppCloudAdapter`, retry, status. Sem lógica de tenant.
- **@devflow/ai-core:** classificação de intent genérica, formatação, fallback, safety, `LLMProvider`. Sem prompts do produto.

## O que ficou no app

- **modules/tenants:** `tenantsRepository`, `tenantService` (resolução por phoneNumberId; fallback para env).
- **modules/conversations:** `conversationsRepository` (findOrCreate, touch, list, count).
- **modules/messaging:** `messagesRepository`, `webhookLogsRepository`, `sendMessageService`, `webhookProcessingService`.
- **modules/ai:** `ruleBasedReplies` (parser + MESSAGES), `aiOrchestrator` (generateAiReply com LLM).
- **modules/analytics:** eventos whatsapp.* (tenant_created, conversation_started, message_sent, etc.).
- **modules/queues:** não implementado (sem filas/agentes na lógica atual).
- **modules/domain:** placeholder.

## Fluxo do webhook (real)

1. POST recebido → `normalizeWebhookPayload` (whatsapp-core).
2. `resolveTenantByPhoneNumberId` (DB ou env WHATSAPP_PHONE_NUMBER_ID + WHATSAPP_ACCESS_TOKEN).
3. Se Supabase configurado: `insertWebhookLog`.
4. Para cada mensagem de texto: `findOrCreateConversation` (se DB), `insertMessage` (inbound), `getReplyForMessage` (regras), `sendReplyAndPersist` ou adapter.sendText, `touchConversationLastMessage`.
5. Analytics: webhook_received, inbound_message_received, conversation_started (se nova), message_sent / message_send_failed.

## Banco de dados

- **Schema:** `apps/whatsapp-platform/supabase/schema.sql` (tenants, conversations, messages, webhook_logs).
- **Tipos:** `apps/whatsapp-platform/src/lib/db/types.ts`.
- **Cliente:** `getSupabaseServiceClient()` em `lib/supabase-server.ts` (service role). Sem Supabase configurado, o app funciona em modo single-tenant via env (sem persistência).

## Variáveis de ambiente

- **Obrigatórias para webhook/envio:** WHATSAPP_VERIFY_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN (ou WHATSAPP_TOKEN).
- **Obrigatórias para persistência:** NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
- **Opcionais:** WHATSAPP_DISPLAY_PHONE_NUMBER, WHATSAPP_DEMO_MODE (true para resposta "demo").

## Endpoints

- **GET /api/health** — status do app.
- **GET /api/webhooks/whatsapp** — verificação Meta (hub.mode, hub.verify_token, hub.challenge).
- **POST /api/webhooks/whatsapp** — eventos WhatsApp (fluxo acima).
- **GET /api/ops/metrics** — contrato Ops (tenants, conversations, messagesLast24h reais quando há Supabase).
- **GET /api/dashboard/conversations** — lista conversas (primeiro tenant).

## Dashboard

- **/dashboard** — KPIs (tenants, conversas, mensagens 24h) via `getOpsMetrics()`.
- **/conversations** — lista de conversas (wa_from, status, last_message_at) quando há Supabase.
- **/agents, /queues, /settings** — scaffold; sem lógica real.

## Lacunas conhecidas

- Billing (users, activeSubscriptions, mrr) não implementado; ops metrics retorna 0.
- Filas e agentes não implementados (sem assignment).
- AI com LLM opcional; fluxo atual é 100% rule-based (getReplyForMessage).
- Autenticação do dashboard não implementada (acesso aberto).
- RLS do Supabase permissivo; ajustar em produção.

## Próximos passos

- Criar projeto Supabase e rodar `schema.sql`.
- Configurar env em produção (verify token, phone number id, access token, Supabase).
- Opcional: integrar LLM em `generateAiReply` e usar em vez de regras para alguns intents.
- Opcional: implementar filas e atribuição de agentes em `modules/queues`.
