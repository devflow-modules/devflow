# Product module pattern

Standard structure for product-specific modules inside an app (`apps/<product>/src/modules/`).

## Directory layout

```
modules/
  auth/
    authService.ts
    authRepository.ts
    (session helpers; use @devflow/auth-core, @devflow/supabase-utils)

  billing/
    BillingService.ts
    BillingRepository.ts
    plans.ts
    featureGuard.ts
    (use @devflow/billing-core for Stripe adapters only)

  analytics/
    productAnalytics.ts
    (use @devflow/analytics-core: increment, getCounters)

  domain/
    (product business logic, entities, use cases)
```

## Auth module

- **Purpose:** Session, user resolution, protected routes.
- **Allowed:** Use `@devflow/auth-core` (e.g. `getAuthUser`), `@devflow/supabase-utils` (server/browser client).
- **Place in app:** `modules/auth/authService.ts`, `authRepository.ts` (if you need DB-backed session data).
- **Proxy:** Session refresh/redirect can live in root `proxy.ts` using the same Supabase client (e.g. from supabase-utils).

## Billing module

- **Purpose:** Plans, feature flags, subscription state, checkout/portal flows.
- **Allowed:** Use `@devflow/billing-core` for: creating checkout session, customer portal session, parsing Stripe webhooks. Types (e.g. `WebhookParsedEvent`, `PlanId`) can come from the package or be re-exported.
- **Must live in app:** `BillingService`, `BillingRepository`, `plans.ts` (FREE/PRO/…), `featureGuard.ts`, product-specific billing analytics (e.g. `trackPlanViewed`).
- **API routes:** Webhook handler and checkout/portal routes call the adapter from billing-core, then call app-level `BillingService` to update DB.

## Analytics module

- **Purpose:** Product-specific events and funnel metrics.
- **Allowed:** Use `@devflow/analytics-core`: `increment`, `getCounters`, `resetMetrics`.
- **Place in app:** `modules/analytics/productAnalytics.ts` — define event names and call the core primitives. Each product can have its own event namespace (e.g. `finance.expense.created`, `crm.lead.created`).

## Domain module

- **Purpose:** Core business logic, entities, use cases specific to the product.
- **Rules:** No imports from other apps. Use packages and other local modules only. DB access via repositories in the app (Prisma/Supabase per product).

## Naming and files

- **Services:** `*Service.ts` — orchestration, use cases, call repositories and adapters.
- **Repositories:** `*Repository.ts` — data access (Prisma/Supabase); keep in app.
- **Plans / config:** `plans.ts`, `featureGuard.ts` — product-specific; keep in app.
- **Adapters:** Only in packages (e.g. billing-core). Apps consume adapters and implement services/repositories.

## Summary

| Concern        | In package              | In app (modules/)                    |
|----------------|-------------------------|--------------------------------------|
| Stripe API     | billing-core            | —                                    |
| Session/auth   | auth-core, supabase-utils | authService, authRepository          |
| Metrics primitives | analytics-core       | productAnalytics, event names        |
| Plans / limits | —                       | billing/plans.ts, featureGuard       |
| DB / state     | —                       | *Repository, *Service                |
| Business logic | —                       | domain/, *Service                    |

This keeps packages free of product logic and keeps product logic in apps under a consistent structure.
