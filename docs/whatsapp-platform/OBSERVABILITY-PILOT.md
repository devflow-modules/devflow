# WhatsApp Platform — Observability for Pilot

**Versão:** 1.0 · **Data:** 2026-06-10  
**App canónico:** `apps/whatsapp-platform`  
**Relacionado:** [PILOT-RUNBOOK.md](./PILOT-RUNBOOK.md) · [SMOKE-TEST-INBOUND-OUTBOUND.md](./SMOKE-TEST-INBOUND-OUTBOUND.md) · [LGPD-PILOT-CHECKLIST.md](./LGPD-PILOT-CHECKLIST.md) (P0-08)

---

## Objetivo

Garantir **rastreabilidade mínima** dos eventos críticos da WhatsApp Platform durante o piloto real, permitindo responder:

- qual **tenant**?
- qual **thread**?
- qual **message id** (interno ou Meta)?
- qual **origem** (webhook, inbound, outbound, IA, handoff, SSE)?
- qual **decisão** ou **erro**?
- **quando** aconteceu?

**Sem** expor tokens, secrets, payload integral da Meta ou corpo completo de mensagens.

Implementação: `apps/whatsapp-platform/src/lib/observability/` (`whatsappLogger.ts`, `pilot-events.ts`, `sanitize.ts`).

---

## Eventos críticos

| Evento | Quando |
|--------|--------|
| `webhook_get_verify_received` | GET verify recebido |
| `webhook_get_verify_success` | Challenge devolvido com sucesso |
| `webhook_get_verify_failed` | Token/mode inválido |
| `webhook_post_received` | POST normalizado (contagens, `phone_number_id`) |
| `webhook_signature_validated` | HMAC válido |
| `webhook_signature_missing` | Header ausente |
| `webhook_signature_invalid` | HMAC inválido ou secret em falta |
| `webhook_tenant_resolved` | Tenant encontrado por `phone_number_id` |
| `webhook_tenant_unresolved` | Linha não mapeada |
| `inbound_message_persisted` | Mensagem gravada em `wa_inbox_messages` |
| `inbound_thread_created` | Nova thread na persistência |
| `inbound_thread_updated` | Thread existente actualizada |
| `ai_decision_auto_reply` | IA autoriza resposta automática |
| `ai_decision_handoff` | IA escala para humano |
| `ai_decision_no_reply` | IA bloqueada (guard/safe mode) |
| `handoff_requested` | Handoff registado (audit + log) |
| `handoff_applied` | Thread PENDING + prioridade HIGH |
| `outbound_send_requested` | Envio Cloud API iniciado |
| `outbound_send_success` | Meta devolveu `message_id` |
| `outbound_send_failed` | Falha antes/durante envio |
| `cloud_api_error` | Erro HTTP Graph API (status/código) |
| `sse_client_connected` | Cliente SSE autenticado |
| `sse_client_disconnected` | Cliente SSE desligou |
| `lead_converted_to_whatsapp_tenant` | CRM portal (documentado; ver § CRM) |

Eventos legados (`events_received`, `message_outbound`, `needs_human_handoff_applied`) mantidos para compatibilidade com runbooks existentes.

---

## Campos padrão de log

Cada linha JSON inclui:

| Campo | Descrição |
|-------|-----------|
| `ts` | ISO8601 |
| `source` | `webhook`, `inbox`, `automation`, … |
| `event` / `event_type` | Nome canónico |
| `trace_id` | Correlation ID do fluxo (webhook POST gera um por request) |
| `tenant_id` | Quando conhecido |
| `thread_id` | `wa_inbox_threads.id` |
| `message_id` | ID interno Prisma |
| `meta_message_id` | `wamid` Meta |
| `phone_number_id` | Linha Cloud API |
| `origin` | `webhook` \| `inbound` \| `outbound` \| `ia` \| `handoff` \| `sse` |
| `reason` | Motivo de decisão/erro (sem PII) |
| `status` / `error_code` | HTTP ou código interno |
| `duration_ms` | Latência IA quando aplicável |

API: `logWhatsappPilotEvent(level, source, event, fields)`.

---

## Eventos inbound webhook

Fluxo típico (grep por `trace_id`):

```
webhook_signature_validated
  → webhook_post_received
  → webhook_tenant_resolved
  → inbound_message_persisted
  → inbound_thread_created | inbound_thread_updated
  → ai_decision_* (se automação activa)
  → outbound_send_* (se auto-reply)
```

**Correlation ID:** gerado no início do `POST` (`newTraceId()`), propagado em persistência, IA, handoff e outbound automático via header de resposta `X-Trace-Id`.

Verbose adicional só com `WHATSAPP_WEBHOOK_VERBOSE=1` — **não** activar em produção piloto sem necessidade.

---

## Eventos IA/handoff

| Evento | Significado |
|--------|-------------|
| `ai_decision_auto_reply` | Pipeline segue para envio |
| `ai_decision_handoff` | Safe mode / baixa confiança / `needs_human` |
| `ai_decision_no_reply` | Guard bloqueou (thread atribuída, keyword, etc.) |
| `handoff_requested` | Acção de audit `handoff_requested` |
| `handoff_applied` | Estado operacional aplicado na thread |

Detalhe de negócio: [AI_AUTOMATION.md](./AI_AUTOMATION.md).

---

## Eventos outbound Cloud API

| Evento | Significado |
|--------|-------------|
| `outbound_send_requested` | Antes do `adapter.sendText` |
| `outbound_send_success` | `meta_message_id` devolvido |
| `outbound_send_failed` | Falha de envio |
| `cloud_api_error` | Status HTTP Graph (ex. `HTTP_401`) — **sem** token |

Telefone destino: apenas `to_masked` via `maskPhoneLike`.

---

## Eventos CRM/funil

Conversão lead → tenant piloto (portal): evento canónico `lead_converted_to_whatsapp_tenant` — registar em ticket/issue com `leadId` + `tenantId` (sem tokens Meta). Implementação futura no portal; ver [LEAD-TO-TENANT-PILOT.md](./LEAD-TO-TENANT-PILOT.md).

---

## Mascaramento e privacidade

Helpers em `sanitize.ts`:

| Helper | Uso |
|--------|-----|
| `maskPhone` / `maskPhoneLike` | E.164 mascarado (`5511***234`) |
| `maskToken` | Sempre `[REDACTED]` |
| `truncateSafe` | Truncar strings longas |
| `sanitizeLogPayload` | Omitir chaves com token/secret/password; mascarar phones |

**Nunca logar:** access tokens, app secrets, payload Meta completo, corpo integral de mensagem.

Alinhado a [LGPD-PILOT-CHECKLIST.md](./LGPD-PILOT-CHECKLIST.md) §6.

---

## Como investigar falhas comuns

| Sintoma | Eventos a procurar | Acção |
|---------|-------------------|--------|
| Inbox vazio | `webhook_tenant_unresolved` | Corrigir `WhatsappPhoneNumber` |
| POST 401 | `webhook_signature_missing` / `webhook_signature_invalid` | `META_APP_SECRET`, header Meta |
| Mensagem não persiste | `inbound_message_persist_failed` | BD, idempotência |
| IA não responde | `ai_decision_no_reply`, `ai_decision_handoff` | Safe mode, assign, guard |
| Outbound falha | `cloud_api_error`, `outbound_send_failed` | Token, canal ACTIVE |
| Handoff invisível | `handoff_applied` + inbox `PENDING` | Fila/assign default |

**Grep Vercel/logs:** `"trace_id":"<valor do X-Trace-Id>"` ou `"event":"webhook_tenant_unresolved"`.

---

## Checklist de observabilidade para smoke test

Durante [SMOKE-TEST-INBOUND-OUTBOUND.md](./SMOKE-TEST-INBOUND-OUTBOUND.md):

- [ ] `webhook_signature_validated` após inbound real
- [ ] `webhook_tenant_resolved` com `tenant_id` correcto
- [ ] `inbound_message_persisted` + `meta_message_id`
- [ ] `inbound_thread_created` ou `inbound_thread_updated`
- [ ] Outbound humano: `outbound_send_success` (ou `outbound_send_failed` + `cloud_api_error` se falhar)
- [ ] **Sem** tokens, secrets ou corpo de mensagem nos logs
- [ ] `trace_id` anotado no registro §10 do smoke test

---

## Dívidas P1/P2

| ID | Item | Prioridade |
|----|------|------------|
| P1 | Dashboard / agregação (Datadog, Sentry, Grafana) | Baixa para piloto |
| P1 | `lead_converted_to_whatsapp_tenant` no portal com log estruturado | Média |
| P1 | Alertas automáticos (`tenant_unresolved` spike) | Média |
| P2 | Correlação OpenTelemetry | Baixa |
| P2 | Retenção/rotação formal de logs Vercel | Compliance |

---

## Histórico

| Data | Alteração |
|------|-----------|
| 2026-06-10 | Versão inicial — P0-09 |
