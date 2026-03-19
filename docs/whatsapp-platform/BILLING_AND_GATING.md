# Billing e Feature Gating — WhatsApp Platform

Documentação da infraestrutura de monetização do WhatsApp Platform.

## Visão geral

- **Planos**: FREE, PRO, SCALE
- **Feature gating**: controle de features por plano
- **Limites de uso**: mensagens, automações, IA, usuários
- **Bloqueios e upsell**: erro `LIMIT_REACHED`, modal de upgrade

## Modelos (Prisma)

### TenantSubscription

- `id`, `tenantId`, `plan`, `status`
- `currentPeriodStart`, `currentPeriodEnd`
- `stripeCustomerId`, `stripeSubscriptionId` (nullable)
- Status: `ACTIVE` | `TRIAL` | `PAST_DUE` | `CANCELED`

### UsageMetric

- `id`, `tenantId`, `metricType`, `value`, `period`
- Tipos: `MESSAGES`, `AUTOMATIONS`, `AI_CALLS`, `USERS`

## Planos

| Plano  | Usuários | Mensagens/mês | Automações | IA     |
|--------|----------|---------------|------------|--------|
| FREE   | 1        | 100           | 0          | 10     |
| PRO    | 3        | 1.000         | 100        | 500    |
| SCALE  | ∞        | ∞             | ∞          | ∞      |

## Features por plano

| Feature       | FREE | PRO | SCALE |
|---------------|------|-----|-------|
| AUTOMATION    | ✗    | ✓   | ✓     |
| PLAYBOOKS     | ✗    | ✗   | ✓     |
| AI_RESPONSE   | ✓    | ✓   | ✓     |
| ADVANCED_AI   | ✗    | ✗   | ✓     |
| MULTI_USER    | ✗    | ✓   | ✓     |
| PRIORITY_SUPPORT | ✗ | ✗   | ✓     |

## APIs

- `GET /api/billing/subscription` — plano e status
- `GET /api/billing/usage` — uso do período
- `POST /api/billing/upgrade` — stub de upgrade (em produção use Stripe Checkout)

## Uso no código

### Feature gating

```ts
import { canUseFeature, assertFeature } from "@/modules/billing/featureGate";

// Verificar
const ok = await canUseFeature(tenantId, "AUTOMATION");

// Lançar erro se bloqueado
await assertFeature(tenantId, "AUTOMATION");
```

### Limites de uso

```ts
import { incrementUsage, getUsage, checkLimit } from "@/modules/billing/usage.service";
import { UsageMetricType } from "@/generated/prisma-whatsapp";

// Antes de executar
const limitCheck = await checkLimit(tenantId, UsageMetricType.AUTOMATIONS);
if (!limitCheck.ok) return; // ou throw

// Após executar
await incrementUsage(tenantId, UsageMetricType.AUTOMATIONS);
```

### Erro de limite (backend)

Quando limite excedido, retornar:

```json
{
  "success": false,
  "error": {
    "message": "Upgrade your plan",
    "code": "LIMIT_REACHED"
  }
}
```

Status HTTP: `402 Payment Required`.

## Integrações

- **Automação** (`trigger.dispatcher.ts`): bloqueia no FREE, limita execuções no PRO
- **IA** (`aiAutomationService.ts`): `AI_RESPONSE` bloqueado no FREE, limite de chamadas
- **Mensagens** (`inbox/send`): limite mensal por plano
- **Usuários**: limite aplicado em fluxo de convite (quando existir)

## UI

- **`/billing`**: plano atual, uso (barra), limites, botão upgrade
- Banner "Você atingiu o limite do plano FREE" quando no limite
- Modal de upgrade ao clicar em "Ver planos"

## Stripe (preparação)

- Campos `stripeCustomerId`, `stripeSubscriptionId` em `TenantSubscription`
- Estrutura pronta para webhook futuro
- Use `POST /api/billing/checkout` para Stripe Checkout em produção

## Variáveis de ambiente

- `BILLING_ENFORCE_LIMITS` — `true` para aplicar limites (default: true)
- `BILLING_PRICE_MESSAGE_BRL`, `BILLING_PRICE_AI_BRL` — preços unitários (opcional)

## Migração

```bash
cd apps/whatsapp-platform && pnpm exec prisma migrate deploy
```

Novos tenants recebem `TenantSubscription` no signup. Tenants existentes usam fallback: `BillingSubscription` → `Tenant.plan` → FREE.
