# WhatsApp Platform — Migration inventory (real code to port)

## Source location

Real production logic lives at **repository root** (legacy structure):

- `src/app/api/webhook/whatsapp/route.ts` — webhook GET (verify) + POST (handle messages)
- `src/modules/whatsapp/webhookHandler.ts` — handleIncomingMessage
- `src/modules/whatsapp/messageParser.ts` — parseMessage, isFirstContact
- `src/modules/whatsapp/messages.ts` — MESSAGES (welcome, menu, option1/2/3, fallback, demo)
- `src/modules/whatsapp/sendMessage.ts` — sendWhatsAppMessage (Cloud API)
- `src/modules/whatsapp/index.ts` — re-exports

## Current entrypoints

| Item | Source | Notes |
|------|--------|------|
| Webhook GET | route.ts | hub.mode, hub.verify_token, hub.challenge → verify with WHATSAPP_VERIFY_TOKEN |
| Webhook POST | route.ts | body.entry[0].changes (field "messages"), value.messages → handleIncomingMessage per msg |
| Message handling | webhookHandler.ts | type text only, parseMessage → MESSAGES[key] or fallback, sendWhatsAppMessage |

## Current WhatsApp Cloud API integration

- **sendMessage.ts:** fetch to `https://graph.facebook.com/v21.0/{phoneNumberId}/messages`, Bearer token, body: messaging_product, to (digits only), type "text", text.body.
- Env: WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN or WHATSAPP_TOKEN.
- No retry in source; whatsapp-core has retryWithBackoff + WhatsAppCloudAdapter.

## Current message processing flow

1. POST webhook → body.entry[0].changes (no use of whatsapp-core normalize).
2. For each change (field "messages"), value.messages[].
3. For each msg: from, type, text.body → handleIncomingMessage({ from, type, text }).
4. handleIncomingMessage: if type !== "text" or !text.body return; intent = parseMessage(text.body); reply = MESSAGES.demo (if demo mode + "demo") or MESSAGES[intent] or MESSAGES.fallback; sendWhatsAppMessage({ to: from, text: reply }).

## Current tenant resolution

- **None.** Single tenant via env: WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN.

## Current persistence layer

- **None.** No DB, no conversations, no message storage.

## Current AI response flow

- **Rule-based only.** parseMessage (keyword/intent) → fixed MESSAGES. No LLM.

## Current queue / assignment logic

- **None.**

## Current analytics / logging

- **None.** Only console.error on webhook error, console.warn when env missing for send.

## Current environment variables

- WHATSAPP_VERIFY_TOKEN — webhook GET verification
- WHATSAPP_PHONE_NUMBER_ID — Cloud API send
- WHATSAPP_ACCESS_TOKEN or WHATSAPP_TOKEN — Cloud API send
- WHATSAPP_DEMO_MODE — "true" enables "demo" message reply

## Mapping to target (apps/whatsapp-platform)

| Source | Target |
|--------|--------|
| Webhook GET verify | app/api/webhooks/whatsapp/route.ts GET (add verify) |
| Webhook POST | app/api/webhooks/whatsapp/route.ts POST → normalize (whatsapp-core) → tenant → log → process → send |
| handleIncomingMessage | modules/messaging or domain: processInboundMessage; use messageParser + MESSAGES or AI |
| parseMessage, isFirstContact | modules/ai (intent) + domain or messages (rule-based replies) |
| MESSAGES | modules/ai or domain (product messages) |
| sendWhatsAppMessage | modules/messaging: use WhatsAppCloudAdapter from whatsapp-core with tenant token/id |
| Env vars | app config / .env.example; tenant from DB or single-tenant from env |

## Gaps (to implement, not port)

- Tenant resolution by phoneNumberId (DB or env fallback).
- Persistence: webhook_logs, tenants, conversations, messages (in Supabase).
- Conversation lifecycle (open/closed), message linking.
- Optional AI path (generateAiReply) alongside rule-based.
- Analytics events (increment).
- Ops metrics from DB.
- Queue/agent logic: optional; can remain minimal (no assignment) for first version.
