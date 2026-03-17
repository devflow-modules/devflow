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
- **Agentes e filas**: `GET /api/admin/agent-status`, `PATCH /api/admin/agent-status`, `GET /api/admin/queues`, `POST /api/admin/conversations/:id/assign`. Página `/admin/agents`.
- **FAQ**: `GET/POST /api/faq`, `GET/PUT/DELETE /api/faq/:id`.
- **Feedback**: `POST /api/admin/messages/:id/feedback` (rating 1 | -1), `GET /api/admin/feedback-report`.
- **Busca e export**: `GET /api/admin/conversations/search?q=`, `GET /api/admin/conversations/:id/export?format=csv`.

## Variáveis de ambiente

| Variable | Descrição |
|----------|-----------|
| `DATABASE_URL` | PostgreSQL (mesmo do webhook-api) |
| `JWT_SECRET` | Chave para assinatura do JWT |
| `NEXT_PUBLIC_APP_URL` | URL base do app (ex: https://wa.example.com) |
| `STRIPE_SECRET_KEY` / `STRIPE_TEST_SECRET_KEY` | Stripe |
| `STRIPE_WEBHOOK_SECRET` | Assinatura do webhook Stripe |
| `STRIPE_PRICE_PRO` / `STRIPE_TEST_PRICE_PRO` | price_id do plano Pro |

## Deploy

```bash
pnpm install
pnpm exec prisma generate
# prisma migrate deploy (ou db push em dev)
pnpm build
pnpm start
```

Configurar webhook Stripe para `POST /api/stripe/webhook`. Em produção, usar `STRIPE_SECRET_KEY` e `STRIPE_PRICE_PRO`.

## Testes

```bash
pnpm test
```

Vitest: testes em `src/**/*.test.ts` (ex.: `modules/auth/__tests__/authService.test.ts`).
