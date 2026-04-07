# Testando o Webhook Stripe

**URL de produção:** `POST {ORIGEM_DO_WHATSAPP_PLATFORM}/api/stripe/webhook`

Use a mesma origem que o deploy do **whatsapp-platform** na Vercel (ex.: `https://whatsapp.devflowlabs.com.br`).  
Não use o domínio do **portal** (`devflowlabs.com.br` / marketing) se esse deploy não servir este app — a rota `/api/stripe/webhook` existe só em `apps/whatsapp-platform`.

Depois de criar ou mudar o endpoint no Stripe, confirma que `WHATSAPP_STRIPE_WEBHOOK_SECRET` no projeto Vercel do whatsapp-platform é o **Signing secret** (`whsec_...`) desse endpoint.

## 1. Testar via Stripe Dashboard (Send test event)

1. Acesse [Stripe Dashboard](https://dashboard.stripe.com) → **Developers** → **Webhooks**
2. Selecione o endpoint cuja URL termina em `/api/stripe/webhook` (origem = teu domínio do app WhatsApp)
3. Clique em **Send test webhook**
4. Escolha o evento (ex.: `checkout.session.completed`, `customer.subscription.updated`)
5. Clique em **Send test webhook**
6. Verifique:
   - **Response**: deve ser `200 OK`
   - **Logs do servidor**: `[STRIPE] checkout.session.completed id: evt_xxx`

Se retornar **400 Webhook Error**: problema de assinatura (ver seção 3).

## 2. Testar fluxo real com checkout

1. Faça login no app
2. Acesse a página de upgrade/billing
3. Selecione um plano e complete o checkout (use cartão de teste: `4242 4242 4242 4242`)
4. Após o pagamento, o Stripe redireciona e envia eventos ao webhook
5. Verifique:
   - Tenant com plano atualizado
   - `BillingSubscription` sincronizado
   - Logs: `[STRIPE] checkout.session.completed`, `[STRIPE] customer.subscription.created`

## 3. Debugar erro de assinatura (400)

**Causas comuns:**

| Causa | Solução |
|-------|---------|
| `WHATSAPP_STRIPE_WEBHOOK_SECRET` incorreto | Copie o **Signing secret** (whsec_...) do endpoint no Stripe Dashboard |
| Ambiente errado | Em prod use secret LIVE; em dev use secret TEST |
| Body modificado | Next.js não deve parsear o body antes da validação (usamos `request.text()`) |

**Como debugar:**

1. Confirme que o secret no `.env` corresponde ao endpoint no Dashboard
2. Em produção, use o secret do endpoint de **produção** (URL com seu domínio)
3. Para teste local com `stripe listen`:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
   O CLI exibe um `whsec_xxx` temporário — use-o em `WHATSAPP_STRIPE_TEST_WEBHOOK_SECRET`

4. Verifique os logs: `[STRIPE] Invalid signature` + detalhe do erro

## Eventos suportados

| Evento | Ação |
|--------|------|
| `checkout.session.completed` | Atualiza tenant, sincroniza subscription |
| `customer.subscription.created` | Idem |
| `customer.subscription.updated` | Atualiza plano, activeUntil |
| `customer.subscription.deleted` | Plan → free, cancela billing |
| `invoice.payment_succeeded` | Snapshot invoice, sync subscription |
| `invoice.payment_failed` | Marca past_due |
| `invoice.finalized` / `invoice.paid` | Snapshot BillingSubscription |
| `invoice.upcoming` | Logado (TODO: notificação) |
