# Auditoria Webhook WhatsApp — Fluxo e Debug

## Hipóteses de debug (H1–H5)

| ID | Hipótese | Onde verificar nos logs |
|----|----------|--------------------------|
| H1 | `normalizeWebhookPayload` retorna null (payload Meta inválido) | `normalize returned null`, `object/entry invalid` |
| H2 | `resolveTenantByPhoneNumberId` retorna null (phone_number_id sem match) | `tenant resolution failed`, `tenant env fallback failed` |
| H3 | `normalized.messages` vazio ou só statuses | `no text messages in payload` |
| H4 | `prepareInboundConversation` retorna null ou `msg.type !== "text"` | `skip non-text`, `prepareInboundConversation returned null` |
| H5 | Graph API falha no envio | `Graph API error`, `Erro ao enviar resposta legada` |

---

## 1. Rota real

| Rota | Arquivo | Handler |
|------|---------|---------|
| `GET/POST /api/webhook/whatsapp` | `src/app/api/webhook/whatsapp/route.ts` | `@wa/modules/whatsapp/webhookHandler` |
| Alias | `apps/whatsapp-platform/src/app/api/webhooks/whatsapp/route.ts` | — |

URL produção: `https://devflowlabs.com.br/api/webhook/whatsapp`

---

## 2. Fluxo real (POST)

```
POST /api/webhook/whatsapp
  → handleWebhookEvents (webhookHandler.ts)
    → request.json() → body
    → normalizeWebhookPayload(body) → null | NormalizedWebhookEvent
    → [se null] return 200 (silencioso)
    → resolveTenantByPhoneNumberId(phoneNumberId) → null | ResolvedTenant
    → [se null] return 200 (silencioso)
    → persistWebhookLog (opcional, Supabase)
    → persistWaInboxFromWebhook (catch, não bloqueia)
    → for each msg in normalized.messages:
        [se msg.type !== "text"] continue
        [se !textBody?.trim()] continue
        → prepareInboundConversation → null | PreparedInbound
        → [se !prep] continue
        → checkTenantAiAutomationReady
        → [se aiReady] void runTenantAiAutoReply (async, catch)
        → [senão] processLegacyInboundAutoReply
            → getReplyForMessage(textBody) → string
            → sendWebhookAutoReply(tenant, to, text)
                → WhatsAppCloudAdapter.sendText() → Graph API
    → return 200
```

---

## 3. Causas prováveis (silêncio)

| # | Ponto | Causa provável | Env / Dado |
|---|-------|----------------|------------|
| 1 | `normalizeWebhookPayload` retorna null | `object !== "whatsapp_business_account"` ou `entry` vazio/inválido | — |
| 2 | `phoneNumberId` vazio | `metadata.phone_number_id` ausente no payload Meta | Estrutura Meta |
| 3 | `resolveTenantByPhoneNumberId` retorna null | Nenhum WhatsappPhoneNumber ACTIVE, nem Tenant, nem env match | `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN` |
| 4 | `normalized.messages` vazio | Payload só tem `statuses`, não `messages` | — |
| 5 | `msg.type !== "text"` | Mensagem é imagem, áudio, etc. | — |
| 6 | `prepareInboundConversation` retorna null | `textBody` vazio | — |
| 7 | `sendWebhookAutoReply` falha | Graph API 4xx/5xx, token inválido, `accessToken` vencido | `WHATSAPP_ACCESS_TOKEN` |
| 8 | `hasSupabaseConfig()` false | Sem Supabase, mas fluxo continua (conversationId="no-db") | `WHATSAPP_SUPABASE_URL`, `WHATSAPP_SUPABASE_SERVICE_ROLE_KEY` |

---

## 4. Arquivos envolvidos

| Arquivo | Função |
|---------|--------|
| `src/app/api/webhook/whatsapp/route.ts` | Entrada HTTP |
| `apps/whatsapp-platform/src/modules/whatsapp/webhookHandler.ts` | Orquestração |
| `packages/whatsapp-core/src/normalize.ts` | Parse payload Meta |
| `apps/whatsapp-platform/src/modules/whatsapp/tenantResolutionService.ts` | Resolução tenant |
| `apps/whatsapp-platform/src/modules/messaging/webhookProcessingService.ts` | prepareInbound, processLegacy |
| `apps/whatsapp-platform/src/modules/messaging/sendMessageService.ts` | Envio Graph API |
| `packages/whatsapp-core/src/adapter.ts` | `WhatsAppCloudAdapter.sendText` |

---

## 5. Envs críticas (Vercel)

| Variável | Uso |
|----------|-----|
| `WHATSAPP_VERIFY_TOKEN` | Verificação GET |
| `WHATSAPP_PHONE_NUMBER_ID` | Fallback tenant (env single-tenant) |
| `WHATSAPP_ACCESS_TOKEN` | Token Graph API (env ou DB) |
| `WHATSAPP_SUPABASE_URL` | Opcional, conversations |
| `WHATSAPP_SUPABASE_SERVICE_ROLE_KEY` | Opcional |
| `WHATSAPP_DEMO_MODE` | `"true"` = só "demo" aciona resposta especial |
