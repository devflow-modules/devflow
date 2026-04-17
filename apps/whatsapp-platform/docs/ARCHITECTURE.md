# Arquitetura — WhatsApp Platform (app)

Visão de alto nível do pacote `apps/whatsapp-platform`: aplicação Next.js (App Router) que serve UI autenticada, APIs REST sob `/api/*`, e integra Prisma (PostgreSQL), Supabase (dados operacionais conforme módulos), Stripe (billing-core), Meta (WhatsApp Cloud API e Embedded Signup).

## Camadas

- **`src/app/`**: páginas, layouts, route handlers (`app/api/**/route.ts`).
- **`src/components/`**: UI reutilizável (inbox, shell, billing, formulários).
- **`src/modules/`**: domínio — `billing`, `whatsapp`, `messaging`, `ai`, `auth`, `tenants`, etc.
- **`src/lib/`**: infra transversal — Prisma client, JWT, product mode, logs verbosos, utilitários.
- **`prisma/`**: schema e migrações da base dedicada ao app WhatsApp.

## Fluxos principais

- **Autenticação**: cookies + JWT (`jose`); signup/login; `GET/PATCH /api/tenants/me`.
- **Inbox**: webhook Cloud API → normalização → tenant → persistência `wa_inbox_*` → automação IA ou legado.
- **Billing (SAAS)**: Stripe checkout, portal, webhooks; dashboards e alertas de uso.
- **Billing (WHITE_LABEL)**: mesma pilha no servidor; payloads HTTP filtrados para tenants; UI de faturação oculta ou redirecionada.

## Observabilidade

Métricas e eventos: `src/lib/observability/`. Logs verbosos de webhook e billing interno são opcionais — ver `.env.example` (`WHATSAPP_WEBHOOK_VERBOSE`, `BILLING_INTERNAL_LOG`).

## Documentação complementar

- [PRODUCT_MODE.md](./PRODUCT_MODE.md) e [WHITE_LABEL_STRATEGY.md](./WHITE_LABEL_STRATEGY.md)
- [billing/BILLING_FLOW.md](./billing/BILLING_FLOW.md), [BILLING_ARCHITECTURE.md](./BILLING_ARCHITECTURE.md)
- [ops/GO_LIVE_WHATSAPP_PLATFORM.md](./ops/GO_LIVE_WHATSAPP_PLATFORM.md)
