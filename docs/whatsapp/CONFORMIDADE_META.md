# Auditoria de Conformidade — WhatsApp Cloud API

Comparação da aplicação com a documentação Meta e padrões do projeto.

## 1. Webhook verification (GET)

| Requisito Meta | Implementação | Status |
|----------------|---------------|--------|
| Params: `hub.mode`, `hub.verify_token`, `hub.challenge` | `searchParams.get("hub.mode")` etc. | ✅ |
| Response 200, body = challenge, `Content-Type: text/plain` | `new NextResponse(challenge, { headers: { "Content-Type": "text/plain" } })` | ✅ |
| Token deve coincidir com configurado no app | `process.env.WHATSAPP_VERIFY_TOKEN` | ✅ |

## 2. Webhook delivery (POST)

| Requisito Meta | Implementação | Status |
|----------------|---------------|--------|
| Response 200 rápido (evitar retries) | Sempre retorna 200, processamento em background | ✅ |
| Estrutura: `object`, `entry[]`, `changes[]`, `value` | `normalizeWebhookPayload` parseia corretamente | ✅ |
| `object === "whatsapp_business_account"` | Validado em normalize | ✅ |
| `value.messages` — mensagens inbound | Extraído e iterado | ✅ |
| `value.statuses` — status sent/delivered/read | Extraído (não processado para reply) | ✅ |
| `metadata.phone_number_id` — pode vir como string ou number | **Corrigir:** normalizar para string | ⚠️ |

## 3. Send message API

| Requisito Meta | Implementação | Status |
|----------------|---------------|--------|
| POST `/{phone-number-id}/messages` | `adapter.sendText(phoneNumberId, options)` | ✅ |
| Headers: Authorization Bearer, Content-Type JSON | Incluídos | ✅ |
| Body: `messaging_product`, `recipient_type`, `to`, `type`, `text.body` | WhatsAppCloudAdapter | ✅ |
| `to` em E.164 (apenas dígitos) | `options.to.replace(/\D/g, "")` | ✅ |
| API version configurável | Fixo v21.0 — **adicionar META_API_VERSION** | ⚠️ |

## 4. Variáveis de ambiente

| Doc projeto (WHATSAPP_WEBHOOK_AND_SENDTEXT) | tenantResolutionService | Status |
|---------------------------------------------|-------------------------|--------|
| `META_PHONE_NUMBER_ID` (prioridade) | Não suportado | ⚠️ |
| `WHATSAPP_PHONE_NUMBER_ID` | Suportado | ✅ |
| `META_WHATSAPP_ACCESS_TOKEN` / `WHATSAPP_ACCESS_TOKEN` | Só WHATSAPP_* | ⚠️ |
| `META_API_VERSION` | Não usado no adapter | ⚠️ |

## 5. Produto webhook no Meta

| Requisito | Status |
|-----------|--------|
| Selecionar **"Whatsapp Business Account"** (não "User") | Documentado |
| Campo **messages** assinado | Documentado |

## 6. Modo Development vs Live

| Modo | Comportamento |
|------|---------------|
| Development | Só números adicionados como "teste" recebem webhooks |
| Live | Qualquer número pode enviar |

## Ações aplicadas (conformidade)

1. ✅ **phone_number_id** — Normalizado com `String()` no normalize (Meta pode enviar number).
2. ✅ **META_PHONE_NUMBER_ID** — Fallback adicionado em tenantResolutionService.
3. ✅ **META_WHATSAPP_ACCESS_TOKEN** — Fallback adicionado.
4. ✅ **META_API_VERSION** — WhatsAppCloudAdapter usa env (default v21.0).
5. ✅ **smb_message_echoes** — Ignorado no normalize (evita responder às próprias mensagens).
