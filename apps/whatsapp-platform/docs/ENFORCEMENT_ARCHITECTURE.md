# Enforcement de Uso — Billing

Controle de uso baseado em plano. Bloqueia ou permite conforme configuração.

---

## 1. Como evita prejuízo

- **Antes da ação**: `enforceUsageOrThrow` roda antes de enviar mensagem ou chamar IA
- **Hard limit**: com `BILLING_ENFORCE_LIMITS=true`, exceder o limite lança erro → ação não é executada
- **Consistência**: uso vem de `UsageAggregate`, limites de `getTenantPlanCapabilities` (plans.ts)

---

## 2. Integração com meter events

- **Soft limit** (`BILLING_ENFORCE_LIMITS=false`): permite uso além da franquia; `trackUsage` grava; `reportMessageUsage`/`reportAiUsage` enviam overage ao Stripe; cobrança no fim do período
- **Hard limit** (`BILLING_ENFORCE_LIMITS=true`): bloqueia antes de executar; nada é gravado nem enviado ao Stripe

---

## 3. Hard vs soft limit e plano FREE

| Modo | BILLING_ENFORCE_LIMITS | Plano FREE | Comportamento |
|------|------------------------|------------|----------------|
| **HARD** | `true` (default) | — | Mensagens: bloqueia ao exceder (planos pagos). |
| **SOFT** | `false` | — | Mensagens (pagos): permite; overage via meter events. |
| **FREE** | qualquer | sempre | Mensagens e IA: **sempre bloqueia** ao exceder o incluído — não há faturação variável. Erro típico: `FREE_PLAN_LIMIT_REACHED`. |

**IA (respostas):** em planos **pagos**, o enforcement **não bloqueia** além do incluído (o excesso segue para faturação via meter). Em **FREE**, bloqueia ao ultrapassar o limite.

Ver também: `docs/billing/FREE_VS_PAID_USAGE.md`.

---

## 4. Onde aplicar

| Local | Feature | Status |
|-------|---------|--------|
| `POST /api/inbox/conversations/[id]/send` | messages | ✅ Integrado |
| `aiAutomationService.runTenantAiAutoReply` | messages + ai | ✅ Integrado |
| `sendMessageService.sendReplyAndPersist` | messages | ⏳ Opcional (admin/conversas) |
| Outros endpoints de envio | messages/ai | Usar `enforceUsageOrThrow` |

---

## 5. Uso

```ts
import { enforceUsageOrThrow, UsageLimitExceededError } from "@/modules/billing";

try {
  await enforceUsageOrThrow({ tenantId, feature: "messages", quantity: 1 });
  await doSendMessage();
  trackUsage(tenantId, UsageEventType.MESSAGE_SENT, { quantity: 1 });
} catch (e) {
  if (e instanceof UsageLimitExceededError) {
    return res.json({ error: e.message, code: e.code }, { status: 402 });
  }
  throw e;
}
```

---

## 6. Logs

- `[USAGE] tenant=<id> feature=<feature> used=<n> limit=<n|unlimited>`
- `[USAGE][BLOCKED] tenant=<id> feature=<feature>` (quando bloqueado)
