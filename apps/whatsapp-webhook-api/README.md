# WhatsApp Webhook API

Express-based inbound WhatsApp message pipeline for the DevFlow platform.

## Stack

- **Node.js** + **TypeScript**
- **Express**
- **Prisma** + **PostgreSQL**
- **@devflow/whatsapp-core** (payload normalization, Cloud API adapter)
- **@devflow/ai-core** (LLM/fallback response generation)

## Architecture

| Layer | Responsibility |
|-------|----------------|
| **WebhookController** | Validates payload, handles GET (verify) and POST (events), delegates to services |
| **ConversationService** | Find-or-create conversation, store inbound message, return context |
| **MessageService** | CRUD for messages (id, conversation_id, sender, message_type, content, timestamp) |
| **WhatsAppService** | `sendTextMessage(phoneNumberId, accessToken, to, text)` via Cloud API |
| **AIService** | `generateResponse(userMessage, recentMessages)` with LLM or fallback |
| **TenantService** | Resolve tenant by phone number, API key, or subdomain |

## Webhook flow

1. **POST /webhooks/whatsapp** → validate payload → extract phone and message
2. Resolve **tenant** (TenantService)
3. **ConversationService.processInbound** → create conversation if needed, store message, return context
4. **AIService.generateResponse** → generate reply (LLM or fallback)
5. **WhatsAppService.sendTextMessage** → send reply
6. **MessageService.create** → persist outbound message

## Setup

```bash
cp .env.example .env
# Edit .env: DATABASE_URL, WHATSAPP_VERIFY_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN

pnpm install
pnpm exec prisma generate
pnpm exec prisma db push   # or migrate
pnpm dev
```

## Multi-tenant

Each **Tenant** has: `id`, `name`, `whatsapp_phone`, `system_prompt`, `default_prompt`, `business_type`, `phone_number_id`, `display_phone_number`, `access_token`, `api_key`, `subdomain`, `stripe_customer_id`, `plan`, `active_until`, `ai_driver`, `crm_webhook_url`, `created_at`, `updated_at`.

**User** (auth): `id`, `tenant_id`, `email`, `password_hash`, `name`, `role` (admin | agent). **ConversationQueue**: fila para HUMAN_SUPPORT. **AgentStatus**: `user_id`, `status` (available | busy | offline), `current_conversation_id`. **FAQ**: base de conhecimento por tenant. **MessageFeedback**: 👍/👎 em mensagens.

**Middleware `resolveTenant()`** resolves the tenant from the request (and attaches it to `req.tenant`):

1. **Subdomain** — e.g. `tenant1.api.example.com` → tenant with `subdomain = "tenant1"`
2. **API key** — header `X-API-Key` or `Authorization: Bearer <api_key>`
3. **Phone** — header `X-Phone-Number-Id` or `X-Phone-Number`, or query `phone` / `phone_number_id`

All conversations and messages are scoped by `tenant_id`. `ConversationService.listByTenant(tenantId)` and `MessageService.listByConversation(conversationId, { tenantId })` enforce tenant scope.

## Endpoints

- **GET /webhooks/whatsapp** — Meta webhook verification (`hub.mode`, `hub.verify_token`, `hub.challenge`)
- **POST /webhooks/whatsapp** — Inbound events (tenant resolved from payload `phone_number_id`)
- **GET /health** — Health check
- **GET /api/conversations** — List conversations for the resolved tenant (requires tenant via API key, subdomain, or phone header)
- **GET /api/conversations/:id/messages** — List messages for a conversation (tenant-scoped)

## Env vars

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `WHATSAPP_VERIFY_TOKEN` | Yes | Token for webhook subscription |
| `WHATSAPP_PHONE_NUMBER_ID` | Yes* | Cloud API phone number ID (*optional until onboarding) |
| `WHATSAPP_ACCESS_TOKEN` | Yes* | Cloud API access token (*optional until onboarding) |
| `WHATSAPP_DISPLAY_PHONE_NUMBER` | No | Display phone (e.g. +5511999999999) |
| `PORT` | No | Server port (default 3005) |
| `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` | No | For AIService LLM; otherwise rule-based only |

## Deploy

- **Database**: run `prisma migrate deploy` (or `db push` in dev). Ensure `User`, `Tenant` (billing fields), `FAQ`, `ConversationQueue`, `AgentStatus`, `MessageFeedback` exist.
- **Platform** (Next.js): configure `DATABASE_URL` (same DB), `JWT_SECRET`, `STRIPE_*`, `NEXT_PUBLIC_APP_URL`. Signup creates User + Tenant; Stripe webhook updates `plan` / `activeUntil`.
- **Webhook**: set Meta app webhook URL to `https://your-api.com/webhooks/whatsapp`. Mídias: image/document saved as metadata; CRM: when intent SALES and `crm_webhook_url` set, POST lead to URL.
