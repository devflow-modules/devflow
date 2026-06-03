# WhatsApp Platform

**WhatsApp Platform** is the DevFlow Labs SaaS/white-label product for WhatsApp-based customer support, automation, metrics and operational workflows.

It is implemented as a **Next.js 16 + TypeScript** app inside the DevFlow monorepo and integrates authentication, tenant onboarding, billing, WhatsApp configuration, dashboards, queues, agents, FAQs, feedback and export flows.

**Portfolio ecosystem:** https://github.com/devflow-modules/devflow  
**Recruiter Guide:** https://github.com/devflow-modules/devflow/blob/main/docs/RECRUITER-GUIDE.md

---

## Recruiter Summary

This app is one of the strongest DevFlow Labs portfolio projects for evaluating product engineering, SaaS architecture, operational dashboards and business-focused automation.

It demonstrates:

- Next.js App Router product architecture
- SaaS and white-label product modes
- JWT authentication with cookies
- Stripe billing and webhook handling
- Tenant onboarding and API key generation
- WhatsApp platform configuration
- Metrics dashboards and operational KPIs
- Agent status, queues and conversation assignment
- Admin/export/support flows
- Accessibility testing with Playwright + axe

---

## Product Overview

The WhatsApp Platform helps businesses structure their WhatsApp operations through a web app that supports onboarding, tenant configuration, metrics, queues, agents, FAQs, feedback and export workflows.

It is designed to work both as:

- **SaaS:** user-facing subscription product with Stripe billing.
- **White-label:** operational product adapted for managers/operators without exposing billing details in the public UI contract.

---

## Business Problem

Many businesses use WhatsApp as a primary customer service and sales channel, but their operations often lack structure.

Common problems:

- Conversations are spread across personal devices.
- Managers lack visibility into queues and agents.
- First-level support is repetitive.
- Metrics are not centralized.
- Billing, onboarding and tenant setup are disconnected.
- White-label deployments require controlled UI and API contracts.

---

## Solution

WhatsApp Platform centralizes the operational layer of WhatsApp-based support:

- Signup, login and onboarding
- Tenant configuration
- WhatsApp API key setup
- Stripe billing in SaaS mode
- Dashboard metrics
- Agent status management
- Queue and conversation assignment
- FAQ management
- Message feedback
- Search and CSV export
- In-app support reporting
- SaaS/white-label UI contract control

---

## Product Mode: SaaS vs White Label

`NEXT_PUBLIC_PRODUCT_MODE` controls whether the UI and public HTTP contracts expose Stripe billing to the end user.

In **WHITE_LABEL** mode, routes and payloads are sanitized for managers/operators while server-side billing logic remains available internally.

Documentation:

- [Product Mode](./docs/PRODUCT_MODE.md)
- [White Label Strategy](./docs/WHITE_LABEL_STRATEGY.md)
- [API Contract](./docs/API_CONTRACT.md)
- [Architecture](./docs/ARCHITECTURE.md)
- [Recruiter Architecture Notes](./docs/RECRUITER-ARCHITECTURE.md)
- [Security Model](./docs/SECURITY-MODEL.md)
- [Testing Strategy](./docs/TESTING.md)

Reference types for white-label responses: `src/types/whiteLabelContracts.ts`.

---

## Business Impact

This product can help companies centralize WhatsApp operations, improve support visibility, track operational metrics, manage queues and agents, and deploy the same base product as SaaS or white-label depending on the commercial model.

It demonstrates how a real business workflow can evolve from messaging automation into an operational SaaS product.

---

## Stack

- **Next.js 16** + **TypeScript**
- **Prisma** + **PostgreSQL**
- **jose** for JWT handling
- **bcryptjs** for password hashing
- **Stripe** through `@devflow/billing-core`
- `@devflow/whatsapp-core`
- **Vitest** for unit/integration tests
- **Playwright + axe** for accessibility checks

---

## Core Features

- **Authentication:** `/signup`, `/login`, `/onboarding`
- **Tenant onboarding:** WhatsApp number, prompt and API key generation
- **Billing:** Stripe checkout and webhook handling
- **Metrics:** overview, agent metrics, intent metrics and KPIs
- **Agents and queues:** status management, queue listing and assignment flows
- **Tenant settings:** tenant update, AI driver configuration and settings page
- **Exports:** conversation and message CSV exports
- **In-app support:** technical support report without tokens
- **FAQ management:** create, update and delete FAQ entries
- **Message feedback:** rating and feedback report
- **Search and export:** conversation search and per-conversation export
- **Accessibility:** Playwright + axe checks for critical flows

---

## Architecture Overview

```text
Next.js App Router
  ↓
Product UI
  ├── Auth flows
  ├── Onboarding wizard
  ├── Dashboard and metrics
  ├── Agents and queues
  ├── FAQ and feedback
  └── Settings and exports

API Routes
  ├── Auth
  ├── Tenant configuration
  ├── Stripe webhook
  ├── Metrics
  ├── Agents / queues
  ├── FAQ
  ├── Feedback
  └── Support reports

Domain Packages
  ├── @devflow/billing-core
  └── @devflow/whatsapp-core

Data Layer
  ├── Prisma
  └── PostgreSQL / Supabase
```

Detailed documentation:

- [Recruiter Architecture Notes](./docs/RECRUITER-ARCHITECTURE.md)
- [Security Model](./docs/SECURITY-MODEL.md)
- [Testing Strategy](./docs/TESTING.md)

---

## Environment Variables

The `.env.example` file in this package is grouped by domain: product, database, WhatsApp, auth, billing and observability.

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_PRODUCT_MODE` | `SAAS` or `WHITE_LABEL` |
| `WHATSAPP_DATABASE_URL` | PostgreSQL pooler URL; should include `?pgbouncer=true` for Supabase/Supavisor |
| `WHATSAPP_DIRECT_URL` | Direct PostgreSQL URL for migrations |
| `WHATSAPP_SUPABASE_URL` / `WHATSAPP_SUPABASE_SERVICE_ROLE_KEY` | Supabase project credentials |
| `JWT_SECRET` | JWT signing secret, minimum 32 characters |
| `NEXT_PUBLIC_WHATSAPP_APP_URL` | Public base URL of the WhatsApp app |
| `WHATSAPP_STRIPE_SECRET_KEY` / `WHATSAPP_STRIPE_TEST_SECRET_KEY` | Stripe keys |
| `WHATSAPP_STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `WHATSAPP_STRIPE_PRICE_PRO` / `WHATSAPP_STRIPE_PRICE_SCALE` | Stripe price IDs |
| `WHATSAPP_WEBHOOK_VERBOSE` | Enables diagnostic webhook logs when set to `1` |
| `BILLING_INTERNAL_LOG` | Enables internal billing route logs when set to `1` |

---

## Post-Signup and Onboarding Flow

After signup or after completing Stripe checkout for the Pro plan, the user is redirected to `/onboarding`.

The onboarding wizard configures:

1. WhatsApp number
2. Prompt/business behavior
3. Tenant API key

The API key is generated at the end of the flow and associated with the tenant.

---

## Security Highlights

- JWT authentication with cookies
- Password hashing with bcryptjs
- Admin routes protected by `admin_metrics_secret` in production
- Admin metrics API protected by `x-admin-metrics-secret` or development environment
- White-label contracts sanitize public responses for managers/operators
- Support reports intentionally avoid sending tokens
- Supabase RLS is enabled in `supabase/schema.sql`
- Service role usage must remain server-side only
- Environment secrets must never be committed

See [Security Model](./docs/SECURITY-MODEL.md) for details.

---

## Deploy

```bash
pnpm install
pnpm exec prisma generate
pnpm build
pnpm start
```

For production, configure the Stripe webhook as:

```text
POST https://<whatsapp-platform-host>/api/stripe/webhook
```

The webhook host must be the WhatsApp Platform app host, not the portal host.

Required production variables include:

- `WHATSAPP_STRIPE_SECRET_KEY`
- `WHATSAPP_STRIPE_WEBHOOK_SECRET`
- `WHATSAPP_STRIPE_PRICE_*`
- `NEXT_PUBLIC_WHATSAPP_APP_URL`

---

## Testing

```bash
pnpm test
```

Vitest tests live under `src/**/*.test.ts`.

Example:

```text
modules/auth/__tests__/authService.test.ts
```

See [Testing Strategy](./docs/TESTING.md) for details.

---

## Accessibility

This app includes Playwright + axe checks for critical WhatsApp Platform flows.

Run locally:

```bash
pnpm test:a11y
```

Authenticated flows require:

```bash
E2E_WHATSAPP_ADMIN_EMAIL=
E2E_WHATSAPP_ADMIN_PASSWORD=
```

Define both in `.env.local` or in the process environment.

For axe coverage on `/admin/whatsapp`, the user must be `platform_admin`.

Manual WCAG AA checklist:

- [WCAG AA Checklist](./docs/accessibility/WCAG-AA-CHECKLIST.md)

---

## Screenshots

Recommended screenshots for portfolio review should be added under `docs/assets/`:

- Signup/login flow
- Onboarding wizard
- Dashboard metrics
- Agents screen
- Queue/conversation assignment
- Settings page
- White-label mode example

---

## Recruiter Notes

This app is most relevant for evaluating:

- Product engineering maturity
- SaaS and white-label thinking
- Next.js App Router architecture
- Authentication and tenant onboarding
- Stripe billing integration
- Metrics and operational dashboards
- Queue/agent workflows
- Testing and accessibility discipline
- Documentation quality inside a monorepo

Suggested review order:

1. Read this README.
2. Review `docs/RECRUITER-ARCHITECTURE.md`.
3. Review `docs/SECURITY-MODEL.md`.
4. Review `docs/TESTING.md`.
5. Review existing product mode and white-label docs.
6. Inspect `src/` modules and API routes.
