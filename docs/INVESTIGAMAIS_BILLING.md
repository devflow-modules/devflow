# Faturamento — Investiga+

Integração de planos, cotas de consultas e Stripe Customer Portal (Fase 3 do sprint).

---

## 1. Modelo de dados

- **users.plan** — `free` | `standard` | `pro` (default `free`).
- **users.remaining_queries** — saldo de consultas no período (default 10 para free).
- **users.stripe_customer_id** — ID do cliente no Stripe para Customer Portal.

Migração para bases existentes: executar `apps/investigamais/supabase/migrations/20250311000000_add_billing_columns.sql`.

---

## 2. Cotas por plano

| Plano     | Consultas/período |
|----------|--------------------|
| free     | 10                 |
| standard | 50                 |
| pro      | 200                |

O `cnpjService.queryCnpj` recebe `userId` opcional; quando informado, verifica `remaining_queries` antes da consulta e decrementa após sucesso. Se saldo for 0, retorna 403 com mensagem para upgrade.

---

## 3. Módulo billing

- **getBillingStatus(userId)** — retorna `plan`, `remaining_queries`, `canUsePortal` (true se tem `stripe_customer_id`).
- **getQueriesLimitForPlan(plan)** — limite de consultas do plano.
- **createPortalSession(userId, returnUrl)** — cria sessão do Stripe Customer Portal; requer `stripe_customer_id`.

APIs: **GET /api/billing/status** (autenticado), **POST /api/billing/portal** (body: `returnUrl`).

---

## 4. Página /dashboard/assinatura

Exibe plano atual, saldo de consultas (X / limite) e botão "Gerenciar assinatura (Stripe)" quando o usuário tem `stripe_customer_id`. O botão chama POST /api/billing/portal e redireciona para a URL retornada.

---

## 5. Variáveis de ambiente

- **STRIPE_SECRET_KEY** — chave secreta Stripe (produção).
- **STRIPE_TEST_SECRET_KEY** — chave de teste (desenvolvimento).

O webhook Stripe e a criação de `stripe_customer_id` ao concluir checkout podem ser implementados em seguida (billing-core já expõe `validateWebhook` e `parseWebhookEvent`).
