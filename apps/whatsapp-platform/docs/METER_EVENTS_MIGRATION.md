# Migração: Stripe Usage Records → Meter Events

## Resumo

O billing do WhatsApp Platform migrou de `subscriptionItems.createUsageRecord()` (legado) para **Stripe Billing Meter Events API**. Apenas **overage** (uso acima da cota incluída) é enviado ao Stripe.

## Alterações

### 1. Nova API de uso

| Antes (legado) | Depois |
|----------------|--------|
| `reportUsage({ subscriptionItemId, quantity })` | **Removido** |
| `reportUsageToStripe({ tenantId, type, quantity, usageEventId })` | **Removido** |
| `queueReportUsageToStripe(...)` | **Removido** |

**Novos serviços:**
- `reportMessageUsage({ tenantId, quantity, timestamp? })` — mensagens
- `reportAiUsage({ tenantId, quantity, timestamp? })` — interações IA

### 2. Event names no Stripe

- `whatsapp_messages` — uso de mensagens
- `ai_usage` — uso de IA

### 3. Configuração no Stripe

**Ponto crítico**: O backend usa `event_name` (whatsapp_messages, ai_usage). O `price_id` **não** é enviado no meter event — está vinculado ao meter no Stripe Dashboard. Fluxo: Backend → envia evento → Stripe → converte em cobrança via price.

1. **Meters**: criar no Dashboard com event names exatos:
   - Messages: `whatsapp_messages` → price `price_1TD50YDCRYOE69AQUi5x3TFf`
   - AI: `ai_usage` → price `price_1TD540DCRYOE69AQnSbivxDS`
2. **ENV** (copiar e colar):
   ```
   WHATSAPP_STRIPE_PRICE_STARTER=price_1TD4h2DCRYOE69AQ4QmjzrGM
   WHATSAPP_STRIPE_PRICE_PRO=price_1TD4itDCRYOE69AQd1oaiV8F
   WHATSAPP_STRIPE_PRICE_SCALE=price_1TD4kTDCRYOE69AQYP8pKaiz
   WHATSAPP_STRIPE_METERED_PRODUCT_MESSAGES=prod_UBRusheWCSbgNs
   WHATSAPP_STRIPE_METERED_PRICE_MESSAGES=price_1TD50YDCRYOE69AQUi5x3TFf
   WHATSAPP_STRIPE_METERED_PRODUCT_AI=prod_UBRxA6RCPfFmTr
   WHATSAPP_STRIPE_METERED_PRICE_AI=price_1TD540DCRYOE69AQnSbivxDS
   ```

### 4. Schema Prisma

**BillingSubscription** — novos campos:
- `messagesIncludedUsed` — mensagens incluídas já usadas no período
- `aiIncludedUsed` — IA incluída já usada no período
- `messagesOverageSent` — overage de mensagens enviado ao Stripe
- `aiOverageSent` — overage de IA enviado ao Stripe

**Nova tabela:**
- `StripeWebhookEvent` — idempotência de webhooks (evita reprocessamento)

### 5. Webhook

- Idempotência: eventos duplicados retornam 200 sem reprocessar
- Reset de quota: ao mudar o período da assinatura, os contadores são zerados

### 6. Fluxo de uso

1. `trackUsage(tenantId, type, quantity)` — grava em `UsageEvent` e `UsageAggregate`
2. Se `isMeterEventsConfigured()`:
   - `reportMessageUsage` ou `reportAiUsage` é chamado
   - Usa quota incluída primeiro; envia apenas overage ao Stripe via `createMeterEvent`

## Migration SQL

Rodar: `pnpm prisma migrate deploy` (ou `migrate dev` em dev)

Arquivo: `prisma/migrations/20260324000000_billing_quota_webhook_idempotency/migration.sql`

## Validação rápida

1. **Meter config no Stripe**: confirmar ligação event_name ↔ price
2. **Teste manual**:
   ```bash
   pnpm test:meter tenant_test 1200
   ```
   Para Starter: 1000 internal, 200 ao Stripe. Validar em Dashboard → Billing → Meter events (value=200).

## Rollback

Não há rollback automático. Para voltar ao legado seria necessário:
- Restaurar `stripeMeteredService` com `reportUsageToStripe`
- Reverter `usageService.trackUsage` para chamar `queueReportUsageToStripe`
- Remover colunas de quota (opcional)

## Compatibilidade

- Checkout, portal e webhooks continuam iguais
- Feature gating e limites por plano inalterados
- Dashboard de uso usa `messagesOverageSent` / `aiOverageSent` quando meter events estão ativos
