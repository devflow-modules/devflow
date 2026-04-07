# WhatsApp Platform — observabilidade e segurança operacional

Âmbito: **`apps/whatsapp-platform`**. Extensão do sistema existente (sem APM obrigatório): logs JSON em **stdout**, auditoria em DB, contadores em memória e alertas simples na consola.

## 1. Log estruturado (`logEvent` / `logError`)

| API | Ficheiro | Uso |
|-----|----------|-----|
| `logEvent(level, source, event, data?)` | `src/lib/observability/log-event.ts` | Uma linha JSON: `ts`, `source`, `event`, campos sanitizados (sem password/token/secret). Prefixo de consola `[source]`. |
| `logError(source, err, context?)` | `src/lib/observability/log-error.ts` | Incrementa métrica `errors` e emite `event: "exception"` com `message` e opcionalmente `stack`. |

**Sources:** `auth`, `inbox`, `admin`, `webhook`, `ops`, `billing`, `automation`, `security`, `app`.

## 2. Auth (`logAuth` + JWT)

- `logAuth` delega em `logEvent` com `source: "auth"` (nível `warn` para falhas / 401 lógicos / rate limit).
- **JWT:** `verifyTokenResult` distingue `jwt_expired` vs `jwt_invalid` antes da validação de sessão DB (`session_rejected` com `reason` adequado).
- **`requireRole`:** aceita `request` opcional; `unauthorized` / `forbidden` incluem `path` e `method` quando disponíveis.
- **Falhas de login repetidas:** `trackLoginFailureForAlert(ip)` — após limiar na janela de 15 min, `console.warn` com prefixo **`[alert]`** + `logEvent` `security` / `alert_login_failures_burst`.

## 3. Inbox e admin

- **Envio outbound:** `sendMessageService` — `bumpMetric("messages_sent")` + `logEvent` `inbox` / `message_outbound`.
- **Inbox API send:** `logEvent` `conversation_message_sent`; 401 sem sessão → `auth` / `unauthorized`; erros → `logError("inbox", ...)`.
- **Admin conversas:** `assign` via `assignThread` (auditoria `WaInboxAuditLog` + realtime); `resolve` via `updateThreadStatus` (idem); `send` com `logAction` + `logEvent`; erros → `logError("admin", ...)`.
- **Fila `queue/next`:** usa `assignThread` + `logEvent` `queue_next_assigned`.

## 4. Webhook WhatsApp

- JSON inválido → `webhook` / `invalid_json`.
- Exceção global → `logError("webhook", ...)`.
- Resolução de tenant falhou → `logError` com `phase: tenant_resolution`.
- Tenant não encontrado → `tenant_unresolved`.
- Persistência inbox falhou → `logError` com `phase: wa_inbox_persist`.
- Após persistência: `bumpMetric("messages_received", n)` (mensagens de texto no batch) + `events_received` com contagens.

## 5. Ops metrics (`/api/ops/metrics`)

- Produção sem secret → `ops` / `metrics_misconfigured`.
- Chave inválida → `metrics_access_denied` + `trackOpsMetricsDeniedForAlert` → possível **`[alert]`** por IP (limiar em janela de 10 min).

## 6. Auditoria em base de dados

### `platform_audit_logs` (`AuditLog` — Prisma)

Gravações **assíncronas** (falha não bloqueia o pedido):

| `action` | Origem |
|----------|--------|
| `login_success`, `logout` | Rotas auth |
| `billing_webhook_processed` | Stripe webhook (sucesso após handler) |
| `automation_rule_create` / `_update` / `_delete` | APIs automation |

### Já existentes (continuam canónicos)

- **`wa_inbox_audit_logs`** — `assign`, `unassign`, `status_change`, `message_send`, tags, etc. (`auditService.logAction`).
- **`billing_audit_logs`** — eventos Stripe e uso (`billingObserverService`, repositório billing).

## 7. Métricas em memória

`bumpMetric` / `getMetricsSnapshot` em `src/lib/observability/metrics.ts`:

| Chave | Quando incrementa |
|-------|-------------------|
| `messages_sent` | Cada outbound em `sendMessageService` |
| `messages_received` | Batch webhook (mensagens texto) |
| `threads_closed` / `threads_opened` | `updateThreadStatus` para `CLOSED` / `OPEN` |
| `errors` | Cada `logError` |

Para inspeção pontual em runtime (debug): importar `getMetricsSnapshot()` num script ou rota interna futura (não exposto por defeito).

## 8. Alertas (consola)

- Prefixo **`[alert]`** em `console.warn` para bursts de falha de login e negações Ops metrics.
- Sem e-mail/SMS; integrar agregador de logs (Vercel, Datadog, etc.) filtrando `[alert]` ou `event` `alert_*`.

## 9. Migração

- `prisma/migrations/*_platform_audit_logs` — tabela `platform_audit_logs`.
- Deploy: `pnpm db:migrate` / `prisma migrate deploy` com `WHATSAPP_DIRECT_URL` / `WHATSAPP_DATABASE_URL`.

## 10. Documentos relacionados

- [`WHATSAPP-OBSERVABILITY-MINIMUM.md`](./WHATSAPP-OBSERVABILITY-MINIMUM.md) — prefixos legados e notas de ruído.
- [`WHATSAPP-AUTH-VALIDATION.md`](./WHATSAPP-AUTH-VALIDATION.md) — comportamento de sessão e APIs auth.
