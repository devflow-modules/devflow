# WhatsApp Platform — hardening do webhook Meta

Implementação: `apps/whatsapp-platform/src/modules/whatsapp/webhookHandler.ts` e rota `src/app/api/webhook/whatsapp/route.ts`.

## GET (handshake)

- `hub.mode=subscribe` + `hub.verify_token` igual a `WHATSAPP_VERIFY_TOKEN` → **200** texto plano com `hub.challenge`.
- Caso contrário → **200** JSON informativo (sem challenge); log **`[WHATSAPP][INFO]`** com modo/presença de token (sem valor do token).

## POST

| Cenário | HTTP | Notas |
|---------|------|--------|
| Corpo não JSON | **400** | `{ error: "Invalid JSON" }` + `[WHATSAPP][ERROR]` |
| Payload que `normalizeWebhookPayload` não entende | **200** | `{ ok: true }` — ack para a Meta; log `[WHATSAPP][INFO]` |
| Tenant não resolvido | **200** | `{ ok: true }` — não derrubar o endpoint |
| Erro inesperado no pipeline | **200** | `{ ok: true }` + `[WHATSAPP][ERROR]` com stack — evita crash e retries agressivos; política documentada no sign-off |
| Mensagem: prep falha / IA falha / legacy falha | Continua loop | Logs por mensagem; legacy com `try/catch` |

## Retries / reentregas

- Respostas **200** com `ok` em casos “sem ação” ou erro interno tratado reduzem risco de fila presa na Meta.
- JSON inválido permanece **400** (cliente claramente errado).

## Parser e campos ausentes

- Normalização em `@devflow/whatsapp-core` (`normalizeWebhookPayload`) devolve `null` ou estrutura com listas vazias; o handler não assume campos obrigatórios além do que o normalizador garante.

## Testes automatizados

`apps/whatsapp-platform/src/modules/whatsapp/__tests__/webhookHandler.test.ts`:

- GET challenge OK / token errado
- POST JSON inválido → 400
- POST `object` inválido → 200 ok
- POST WABA com `phone_number_id` e tenant ausente (mock) → 200 ok

## Referência operacional

`docs/whatsapp/WEBHOOK_META_CHECKLIST.md`
