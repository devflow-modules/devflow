# WhatsApp Platform

App Next.js do produto WhatsApp Platform (DevFlow). Onboarding, auth (JWT + cookies), billing (Stripe), dashboard de métricas, gestão de agentes e filas, FAQs e feedback.

## Stack

- **Next.js 16** + **TypeScript**
- **Prisma** + **PostgreSQL** (mesmo DB do whatsapp-webhook-api)
- **jose** (JWT) + **bcryptjs** (senha)
- **@devflow/billing-core** (Stripe checkout + webhook)
- **@devflow/whatsapp-core**

## Funcionalidades

- **Auth**: `/signup`, `/login`, `/onboarding` (wizard: WhatsApp → prompt → API Key). `POST /api/auth/signup`, `POST /api/auth/login`, `GET /api/tenants/me`, `PATCH /api/tenants/me`, `POST /api/tenants/me/api-key`.
- **Billing**: Checkout Stripe no signup (plano Pro); `POST /api/stripe/webhook` atualiza `plan` e `activeUntil` do Tenant.
- **Métricas**: `GET /api/metrics/overview`, `/api/metrics/agents`, `/api/metrics/intents`. Dashboard com cartões, volume por dia, intenções, KPIs por agente.
- **Agentes e filas**: `GET /api/admin/agent-status`, `PATCH /api/admin/agent-status`, `GET /api/admin/queues` (threads `wa_inbox` em espera), `GET /api/admin/queue/next` (próxima thread não atribuída + assign opcional), `POST /api/admin/conversations/:id/assign`. Páginas `/queues` (Supabase legado), `/agents`, `/admin/distribuir`.
- **Configuração do tenant**: `GET /api/tenants/me`, `PATCH /api/tenants/me` (inclui `aiDriver`: `ruleBased` | `openAI` | `claude`). Página `/settings`.
- **Exportação**: `GET /api/admin/export/conversations?from=&to=` e `GET /api/admin/export/messages?from=&to=` (CSV). Botões no dashboard de métricas.
- **Suporte in-app**: botão «Precisa de ajuda?» (sidebar, dashboard, inbox); `POST /api/support/report` envia contexto técnico (sem tokens) por e-mail (Resend) e/ou webhook opcional — ver `WHATSAPP_SUPPORT_NOTIFY_EMAIL` e `WHATSAPP_SUPPORT_WEBHOOK_URL` no `.env.example`.
- **FAQ**: `GET/POST /api/faq`, `GET/PUT/DELETE /api/faq/:id`.
- **Feedback**: `POST /api/admin/messages/:id/feedback` (rating 1 | -1), `GET /api/admin/feedback-report`.
- **Busca e export**: `GET /api/admin/conversations/search?q=`, `GET /api/admin/conversations/:id/export?format=csv`.

## Variáveis de ambiente

| Variable | Descrição |
|----------|-----------|
| `WHATSAPP_DATABASE_URL` | PostgreSQL pooler — **obrigatório** `?pgbouncer=true` no final da URL (Supabase/Supavisor) |
| `WHATSAPP_DIRECT_URL` | PostgreSQL direta (migrations) |
| `WHATSAPP_SUPABASE_URL` / `WHATSAPP_SUPABASE_SERVICE_ROLE_KEY` | Supabase do projeto WhatsApp |
| `JWT_SECRET` | Chave para assinatura do JWT (mín. 32 caracteres) |
| `NEXT_PUBLIC_WHATSAPP_APP_URL` | URL base do app (ex: https://wa.example.com) |
| `WHATSAPP_STRIPE_SECRET_KEY` / `WHATSAPP_STRIPE_TEST_SECRET_KEY` | Stripe |
| `WHATSAPP_STRIPE_WEBHOOK_SECRET` | Assinatura do webhook Stripe |
| `WHATSAPP_STRIPE_PRICE_PRO` / `WHATSAPP_STRIPE_PRICE_SCALE` | price_id dos planos |

## Fluxo pós-signup e onboarding

Após o signup (ou após concluir o checkout Stripe no plano Pro), o usuário é redirecionado para **/onboarding**, onde configura número WhatsApp, token e prompt; ao final é gerada a API key do tenant. Recomenda-se não pular essa etapa para que o número e o token fiquem associados ao tenant.

## Segurança e RLS

- Rotas **/admin** em produção exigem o cookie `admin_metrics_secret` com valor igual a `WHATSAPP_ADMIN_METRICS_SECRET` (ou login em `/admin/login` que define esse cookie).
- A API **/api/admin/metrics** exige o header `x-admin-metrics-secret` ou ambiente de desenvolvimento.
- No Supabase, o arquivo `supabase/schema.sql` já habilita RLS nas tabelas; as políticas atuais são permissivas para uso com service role. Em cenários multi-tenant com Supabase Auth, ajuste as políticas para filtrar por `tenant_id` (por exemplo, `using (tenant_id = auth.jwt() ->> 'tenant_id')`).

## Deploy

```bash
pnpm install
pnpm exec prisma generate
# prisma migrate deploy (ou db push em dev)
pnpm build
pnpm start
```

Configurar webhook Stripe para `POST https://<mesmo-host-do-app>/api/stripe/webhook` (o host deve ser o deploy do **whatsapp-platform**, ex. `whatsapp.devflowlabs.com.br`, não o portal). Em produção: `WHATSAPP_STRIPE_SECRET_KEY`, `WHATSAPP_STRIPE_WEBHOOK_SECRET` (segredo do endpoint no Stripe), `WHATSAPP_STRIPE_PRICE_*` e `NEXT_PUBLIC_WHATSAPP_APP_URL`.

## Testes

```bash
pnpm test
```

Vitest: testes em `src/**/*.test.ts` (ex.: `modules/auth/__tests__/authService.test.ts`).
