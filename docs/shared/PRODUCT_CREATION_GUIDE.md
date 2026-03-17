# Product creation guide

How to add a new SaaS product app to the DevFlow monorepo.

## Prerequisites

- Monorepo structure with `apps/*` and `packages/*`.
- pnpm workspace. See [ARCHITECTURE_BOUNDARIES.md](./ARCHITECTURE_BOUNDARIES.md).

## Create the app

From the repo root:

```bash
pnpm run create-product <name>
```

Example:

```bash
pnpm run create-product crm
```

This will:

- Copy `templates/product-app/` to `apps/<name>/`.
- Set `package.json` name to `@devflow/app-<name>`.
- Add a basic layout, page, `globals.css`, middleware, and `/api/health`.
- Add `next.config.ts`, `postcss.config.mjs`, and `tsconfig.json` with `@devflow/*` path aliases.

## After creation

1. **Install dependencies (from root):**
   ```bash
   pnpm install
   ```

2. **Add the app to ESLint boundary rules**  
   Edit `eslint.config.mjs` and add the new app name to the `APP_NAMES` array so app↔app import restrictions apply.

3. **Supabase (and DB) per product**  
   Use a dedicated Supabase project and database for this product. Do not share DB with other products.

4. **Implement product logic**  
   - Put auth in `src/modules/auth/` (use `@devflow/auth-core`, `@devflow/supabase-utils`).
   - Put billing in `src/modules/billing/` (use `@devflow/billing-core` for Stripe adapters only; keep `BillingService`, `plans.ts`, feature guard in the app).
   - Put analytics in `src/modules/analytics/` (use `@devflow/analytics-core` for primitives).
   - Put domain logic in `src/modules/domain/`.

5. **Ops metrics (optional)**  
   If the product should appear in the Ops dashboard, implement the contract in [OPS_METRICS_CONTRACT.md](./OPS_METRICS_CONTRACT.md) (e.g. `GET /api/ops/metrics`).

## Structure

- `src/app/` — Next.js App Router (routes, layouts, API routes).
- `src/components/` — App-specific components; use `@devflow/ui` for shared primitives.
- `src/modules/` — Product modules (auth, billing, analytics, domain). See [PRODUCT_MODULE_PATTERN.md](./PRODUCT_MODULE_PATTERN.md).
- `src/lib/` — App-level utilities (not shared across products).

## Allowed dependencies

- **From packages only:** `@devflow/ui`, `@devflow/billing-core`, `@devflow/analytics-core`, `@devflow/auth-core`, `@devflow/supabase-utils`, `@devflow/testing-utils`, `@devflow/config`, `@devflow/whatsapp-core`, `@devflow/ai-core`.
- **No imports from other apps.** See [ARCHITECTURE_BOUNDARIES.md](./ARCHITECTURE_BOUNDARIES.md).

## Billing

- Use `@devflow/billing-core` for: checkout session, customer portal session, webhook parsing (Stripe).
- Implement in the app: `BillingService`, `BillingRepository`, `plans.ts`, feature guards, product-specific analytics (e.g. `trackPlanViewed`).

## Analytics

- Use `@devflow/analytics-core` for: `increment`, `getCounters`, `resetMetrics`.
- In the app: define product events and call these primitives (e.g. in `modules/analytics/productAnalytics.ts`).
