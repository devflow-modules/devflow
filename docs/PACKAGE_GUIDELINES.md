# Package guidelines

How to create and maintain shared packages in the DevFlow monorepo.

## When to create a package

Create a new package under `packages/` when you have:

- Code used by **more than one app** (or likely to be).
- **No product-specific logic** (no plans, no DB, no product dashboards).
- Reusable: **utilities, adapters, UI primitives, types, infra helpers, analytics contracts, testing helpers**.

Do **not** create a package for:

- Product business logic (services, repositories, feature flags).
- Product-specific plans or APIs.
- Product dashboards or admin UIs.

See [ARCHITECTURE_BOUNDARIES.md](./ARCHITECTURE_BOUNDARIES.md) for the full boundary rules.

## Creating a package

1. **Copy the template:**
   ```bash
   cp -r templates/package packages/<name>
   ```

2. **Rename in `package.json`:**
   - Set `"name": "@devflow/<name>"`.

3. **Implement in `src/`:**
   - Only shared, product-agnostic code.
   - Export the public API from `src/index.ts`.

4. **Add dependencies (if needed):**
   - Use `workspace:*` for other packages, e.g. `"@devflow/config": "workspace:*"`.
   - Packages must **not** depend on apps.

5. **Use in apps:**
   - Add `"@devflow/<name>": "workspace:*"` to the app’s `package.json`.
   - Import with the alias (e.g. `import x from "@devflow/<name>"`). Paths are standardized in tsconfig.

## Allowed contents

| Allowed | Examples |
|--------|----------|
| Reusable utilities | Formatters, validators, pure helpers |
| Provider adapters | Stripe (billing-core), Supabase clients (supabase-utils), WhatsApp API (whatsapp-core) |
| UI primitives | Button, Badge, Card (no product copy or flows) |
| Shared types | Billing event types, adapter interfaces |
| Infrastructure helpers | Auth helpers (auth-core), server/browser client factories |
| Analytics contracts | Event names, increment/getCounters (analytics-core) |
| Testing helpers | Mocks, factories (testing-utils) |

## Forbidden contents

| Forbidden | Reason |
|-----------|--------|
| Product business logic | Belongs in apps (e.g. `modules/domain`) |
| Database queries | Each app has its own DB; queries stay in app repositories |
| Product-specific plans | e.g. FREE/PRO/TEAM for one product — keep in app `modules/billing/plans.ts` |
| Product-specific APIs | Route handlers, server actions — only in apps |
| Product dashboards | Admin/metrics UI — only in apps |

## Package-to-package imports

- A package may import **only** from packages listed in its `package.json` dependencies.
- Avoid **circular dependencies** (e.g. `ui` must not depend on `billing-core` if `billing-core` depends on `ui`).

## TypeScript

- Extend the base config: `"extends": "../config/tsconfig.base.json"` (from `packages/<name>/tsconfig.json`).
- Path aliases for other packages are defined in `packages/config/tsconfig.base.json`; use `@devflow/<name>` in imports when appropriate.

## Documentation

- Each package should have a `README.md` describing purpose, exports, and usage.
- Document any exception to the boundary rules in [ARCHITECTURE_BOUNDARIES.md](./ARCHITECTURE_BOUNDARIES.md).
