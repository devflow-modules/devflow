# Sprint: Webhook verification + envio real (Cloud API)

## Objetivo

Fechar o ciclo operacional em produção:

1. Meta valida o webhook (GET / challenge).
2. Eventos reais chegam no POST.
3. Envio de texto via Graph API (`POST /{phone-number-id}/messages`).
4. Logs e health para troubleshooting rápido.
5. Base para o próximo sprint (inbound + persistência de conversas).

---

## 1. Fluxo oficial (mapeamento)

| Aspecto | Descrição |
|--------|-----------|
| **Webhook verification** | A Meta faz **GET** na URL configurada com `hub.mode=subscribe`, `hub.verify_token=<seu token>`, `hub.challenge=<string>`. Se o token confere com o valor que você definiu no app, você responde **200** com o **body texto puro** = valor de `hub.challenge`. Isso **não** envia mensagens; só prova posse do endpoint. |
| **Webhook delivery** | Após verificado, a Meta envia **POST** com JSON (`object`, `entry[]`, `changes[]`, `value` com `messages`, `statuses`, etc.). Deve responder **200** rápido; caso contrário a Meta retenta. |
| **Message Send API** | **POST** `https://graph.facebook.com/{META_API_VERSION}/{META_PHONE_NUMBER_ID}/messages` com Bearer token e body `messaging_product: whatsapp`, `to`, `type: text`, `text: { body }`. Independente do webhook. |

**Diferenças:**

- **Verification** = handshake único (GET + challenge).
- **Delivery** = notificações contínuas (POST).
- **Send** = você chama a Graph API para entregar mensagem ao usuário.

**Pré-condições para enviar texto:**

- Token válido (`META_SYSTEM_USER_TOKEN` ou `META_WHATSAPP_ACCESS_TOKEN` ou `WHATSAPP_ACCESS_TOKEN`).
- `META_PHONE_NUMBER_ID` (ou `WHATSAPP_PHONE_NUMBER_ID`) do número Cloud API.
- Número registrado na Cloud API (fluxo de onboarding concluído).
- Destinatário em formato E.164 permitido pela política da Meta (ex.: janela de 24h ou template aprovado).

---

## 2. Arquitetura no monorepo (site Next.js)

| Caminho | Função |
|---------|--------|
| `src/modules/whatsapp-webhook/` | Verification, parsing de inbound, mappers, logs. |
| `src/modules/whatsapp-messaging/` | `sendTextMessage`, health de mensageria, erros Meta. |
| `src/modules/whatsapp-onboarding/` | Onboarding (inalterado); env compartilhado (`loadMetaOnboardingEnv`). |
| `src/modules/whatsapp/` | `handleIncomingMessage` + respostas demo (reutilizado após parse). |
| `src/app/api/webhook/whatsapp/route.ts` | GET verification + POST eventos. |
| `src/app/api/admin/whatsapp/messages/send-text/route.ts` | Envio administrativo de texto. |
| `src/app/api/admin/whatsapp/messages/health/route.ts` | Health operacional. |

**Pacote:** `@devflow/whatsapp-core` — `WhatsAppCloudAdapter.sendText` (endpoint oficial).

---

## 3. Endpoints

| Método | Rota | Uso |
|--------|------|-----|
| GET | `/api/webhook/whatsapp` | Verification (`hub.mode`, `hub.verify_token`, `hub.challenge`). |
| POST | `/api/webhook/whatsapp` | Eventos Meta (mensagens, status, etc.). |
| POST | `/api/admin/whatsapp/messages/send-text` | Envio real de texto (header admin). |
| GET | `/api/admin/whatsapp/messages/health` | Health de mensageria. |

**Admin:** header `x-admin-whatsapp-secret` = `ADMIN_WHATSAPP_ONBOARDING_SECRET` ou `ADMIN_METRICS_SECRET` (mesmo padrão do onboarding). Em dev, se nenhum secret estiver definido, as rotas admin podem ficar abertas (ver `guardWhatsappOnboarding`).

---

## 4. Variáveis de ambiente

| Variável | Uso |
|----------|-----|
| `WHATSAPP_VERIFY_TOKEN` | Deve ser **idêntico** ao token configurado no painel Meta (Webhook). |
| `META_SYSTEM_USER_TOKEN` | Token Graph (prioridade 1). |
| `META_WHATSAPP_ACCESS_TOKEN` | Alternativa ao system user. |
| `WHATSAPP_ACCESS_TOKEN` | Fallback legado. |
| `META_PHONE_NUMBER_ID` | ID do número na Cloud API (prioridade sobre `WHATSAPP_PHONE_NUMBER_ID`). |
| `META_WABA_ID` | WABA; usado no health (persistência `registeredAt`). |
| `META_API_VERSION` | Ex.: `v21.0`. |

---

## 5. Cadastro no App Dashboard (Meta)

1. **WhatsApp → Configuration → Webhook**  
   - URL de callback: `https://<seu-dominio>/api/webhook/whatsapp`  
   - Verify token: mesmo valor de `WHATSAPP_VERIFY_TOKEN`.  
2. Salvar → a Meta chama o GET de verification.  
3. Inscrever o campo **messages** (e demais necessários).

---

## 6. Health de mensageria (`GET .../messages/health`)

Campos principais:

- `envOk`, `tokenOk`, `wabaOk`, `phoneNumberIdOk`
- `webhookVerifyTokenConfigured`
- `readyToVerifyWebhook`, `readyToReceiveEvents`, `readyToSendMessages`
- `blockedReason` (enum fechado)
- `metaSummary` (status de probe na Graph, etc.)

**`blockedReason`:** `NONE`, `TOKEN_MISSING`, `TOKEN_INVALID`, `PHONE_NUMBER_ID_MISSING`, `PHONE_NUMBER_NOT_REGISTERED`, `WEBHOOK_VERIFY_TOKEN_MISSING`, `META_PERMISSION_DENIED`, `META_API_ERROR`, `UNKNOWN`.

---

## 7. Checklist antes de enviar texto

- [ ] `GET .../messages/health` → `readyToSendMessages: true` (ou entender o `blockedReason`).
- [ ] Destinatário autorizado (número de teste ou janela 24h / template).
- [ ] `POST send-text` com header admin correto em produção.

---

## 8. cURL — send-text

```bash
export BASE=https://seu-dominio.com.br
export SECRET=sua_chave_admin

curl -sS -X POST "$BASE/api/admin/whatsapp/messages/send-text" \
  -H "Content-Type: application/json" \
  -H "x-admin-whatsapp-secret: $SECRET" \
  -d '{"to":"5511999999999","text":"Teste DevFlow Cloud API","preview_url":false}'
```

**Sucesso (ex.):** `{ "success": true, "data": { "success": true, "messageId": "wamid...", ... } }`  
**Falha:** `{ "success": false, "data": { "success": false, "errorCode": "...", "errorMessage": "..." } }`

---

## 9. Confirmar evento no webhook

Após envio, a Meta pode enviar **status** (`sent`, `delivered`, `read`) no POST do webhook. Nos logs do servidor procure `whatsapp_webhook_event` com `kind: "status"` e o `messageId` correspondente.

---

## 10. Troubleshooting (runbook)

| Sintoma | Causa provável | Ação |
|---------|----------------|------|
| Webhook não valida | Token diferente do painel | Alinhar `WHATSAPP_VERIFY_TOKEN` com o campo Verify token na Meta. |
| 403 no GET | `hub.mode` ≠ subscribe ou token errado | Conferir query params exatos da Meta. |
| Challenge não retorna | Challenge vazio ou rota errada | Garantir resposta **text/plain** com o valor do challenge. |
| Evento não chega | URL webhook incorreta ou campo não inscrito | Verificar URL pública HTTPS e subscription `messages`. |
| Status não chega | Webhook ou número errado | Conferir `phone_number_id` no metadata do evento. |
| Erro no envio | Token sem permissão / número não registrado | Health + onboarding register. |
| Permission denied (403 Graph) | Token ou app sem escopo | System User com permissões WhatsApp. |
| Mensagem aceita sem delivery | Bloqueio do destinatário ou fora da janela | Usar número autorizado ou template. |
| Evento desconhecido | Novo `field` da Meta | Logs `unknown_field`; fluxo segue com 200. |

---

## 11. Modelo de evidência operacional (JSON)

```json
{
  "executedAt": "2025-03-17T12:00:00.000Z",
  "environment": "production",
  "phoneNumberId": "123456789",
  "webhookUrl": "https://example.com/api/webhook/whatsapp",
  "verificationCompleted": true,
  "sendTestExecuted": true,
  "sendResult": "success",
  "messageId": "wamid.xxx",
  "inboundEventReceived": true,
  "blockedReasonFinal": "NONE",
  "conclusion": "E2E webhook + send OK"
}
```

---

## 12. Testes (Vitest)

- `src/modules/whatsapp-webhook/__tests__/` — verification, mapper, payload vazio.
- `src/modules/whatsapp-messaging/__tests__/` — schema send, parse erro Meta, health (fetch mock).

```bash
pnpm exec vitest run src/modules/whatsapp-webhook src/modules/whatsapp-messaging
```

---

## Próximos passos

- Persistir conversas e mensagens inbound.
- Filas / idempotência por `messageId`.
- Templates e janela 24h documentada por tenant.

---

## Referências oficiais

- [Webhook verification](https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests)
- [Webhook payload](https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/components)
- [Send messages](https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-messages)
