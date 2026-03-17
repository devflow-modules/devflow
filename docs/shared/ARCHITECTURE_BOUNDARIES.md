# Architecture boundaries

This document defines strict boundaries for the DevFlow Labs monorepo. Enforcement is done via ESLint `no-restricted-imports` and code review.

---

## 1. Package boundary rules

### Shared packages MAY contain only

- **Reusable utilities** — pure functions, formatters, validators used across products.
- **Provider adapters** — e.g. Stripe (billing-core), Supabase clients (supabase-utils), WhatsApp API (whatsapp-core).
- **UI primitives** — buttons, badges, cards, layout components with no product-specific copy or flows.
- **Shared types** — interfaces and types used by multiple apps (e.g. billing event types).
- **Infrastructure helpers** — auth helpers (auth-core), server/browser client factories.
- **Analytics contracts** — event names, increment/getCounters (analytics-core), not product-specific dashboards.
- **Testing helpers** — mocks, factories (testing-utils).

### Shared packages MUST NOT contain

- **Product business logic** — rules, workflows, or domain logic specific to one product.
- **Database queries** — Prisma/Supabase queries; these live in apps (e.g. `modules/*/repositories`).
- **Product-specific plans** — e.g. FREE/PRO/TEAM definitions for one product; use packages only for generic types/adapters.
- **Product-specific APIs** — route handlers, server actions; only in apps.
- **Product dashboards** — admin/metrics UI or product-specific analytics UI; only in apps.

### Summary

| Allowed in packages | Forbidden in packages |
|---------------------|------------------------|
| Adapters (Stripe, Supabase, etc.) | BillingService, BillingRepository |
| Generic types (WebhookParsedEvent, PlanId) | Product plans (Plans, featureGuard) |
| UI primitives (Button, Badge) | Dashboards, product-specific metrics UI |
| Auth helpers (getAuthUser) | Session/DB queries per product |
| Analytics primitives (increment, getCounters) | Product analytics (trackPlanViewed per product) |
| Testing mocks/factories | E2E or product-specific test code |

---

## 2. App boundary rules

- **Apps cannot import from other apps.** No `from 'apps/site/...'` or `from '@devflow/app-site'` (apps are not published packages).
- **Apps may only import from `packages/*`** using the `@devflow/*` aliases (and from their own `@/*` app code).
- **Apps own product logic:** services, repositories, plans, feature flags, dashboards, API routes.

---

## 3. Package-to-package imports

- Packages may import from other packages **only when explicitly allowed** (declared dependency in `package.json`).
- Avoid circular dependencies. Dependency direction should be acyclic (e.g. `ui` does not depend on `billing-core`).

---

## 4. TypeScript path aliases (standard)

Use these aliases; do not use relative paths to `packages/` from apps:

- `@devflow/ui`
- `@devflow/billing-core`
- `@devflow/analytics-core`
- `@devflow/auth-core`
- `@devflow/supabase-utils`
- `@devflow/testing-utils`
- `@devflow/config`
- `@devflow/whatsapp-core`
- `@devflow/ai-core`

---

## 5. Exceptions

Any exception (e.g. a package importing from an app, or an app importing from another app) must be:

1. Documented in this file under "Exceptions" with a short justification.
2. Revisited in the next architecture review to remove or replace with a shared package.

---

## 6. Enforcement

- **ESLint:** `no-restricted-imports` forbids app↔app and package→app imports; see root and app-level `eslint.config.*`.
- **CI:** `pnpm run lint:workspace` must pass.
- **Review:** PRs that add cross-boundary imports require explicit approval and doc update if an exception is introduced.
