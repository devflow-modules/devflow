# Governance & boundaries — implementation summary

This document summarizes the governance, boundaries, and templates added to the DevFlow monorepo. **No functionality was changed;** builds and tests remain passing.

---

## 1. New architecture rules

### TypeScript path standardization (Phase 1)

- **Aliases:** All apps and the root `tsconfig` use the same path aliases for packages:
  - `@devflow/ui`, `@devflow/billing-core`, `@devflow/analytics-core`, `@devflow/auth-core`, `@devflow/supabase-utils`, `@devflow/testing-utils`, `@devflow/config`, `@devflow/whatsapp-core`, `@devflow/ai-core`
- **Where:** `packages/config/tsconfig.base.json` (for packages that extend it), and each app’s `tsconfig.json` plus root `tsconfig.json` (for apps and root).
- **Rule:** Prefer these aliases; avoid relative imports like `../../../packages/...`.

### Package boundary rules (Phase 2)

- **Document:** `docs/ARCHITECTURE_BOUNDARIES.md`
- **Rules:**
  - **Packages may only contain:** reusable utilities, provider adapters, UI primitives, shared types, infrastructure helpers, analytics contracts, testing helpers.
  - **Packages must not contain:** product business logic, DB queries, product-specific plans/APIs/dashboards.
  - **Apps:** Cannot import from other apps; may only import from `packages/*` (and own `@/*`).
  - **Packages:** Cannot import from apps; may import only from other packages (as declared in `package.json`).

### ESLint import restrictions (Phase 3)

- **Rule:** `no-restricted-imports` in `eslint.config.mjs`:
  1. **Global:** No imports from `@devflow/app-*` (apps are not importable packages).
  2. **In `packages/**`:** No imports matching `*apps/<app>*` for any app name.
  3. **In `apps/<name>/**`:** No imports matching `*apps/<other>*` for any other app.
- **Exemptions:** Document any needed exception in `docs/ARCHITECTURE_BOUNDARIES.md` (section Exceptions).

---

## 2. Templates created

### Product app template (Phase 4)

- **Path:** `templates/product-app/`
- **Contents:**
  - `src/app/layout.tsx`, `page.tsx`, `globals.css`
  - `src/app/api/health/route.ts`
  - `src/middleware.ts`
  - `src/components/`, `src/lib/`, `src/modules/auth/`, `billing/`, `analytics/`, `domain/` (with `.gitkeep` and short comments on where product logic lives).

### Package template (Phase 5)

- **Path:** `templates/package/`
- **Contents:**
  - `package.json` (name `@devflow/package-name`), `tsconfig.json`, `README.md`
  - `src/index.ts` (example export and reminder of package rules).
- **Usage:** Copy to `packages/<name>/`, rename package, implement only shared code.

---

## 3. Scripts created

### Product creation script (Phase 6)

- **Path:** `scripts/create-product.mjs`
- **Usage:** `pnpm run create-product <name>` (e.g. `pnpm run create-product crm`)
- **Behavior:**
  - Copies `templates/product-app/` to `apps/<name>/`
  - Replaces placeholders (Product → title, product → name)
  - Creates `package.json` (`@devflow/app-<name>`), `next.config.ts`, `postcss.config.mjs`, `tsconfig.json` (with `@devflow/*` paths)
  - Prints next steps (install, add app to `APP_NAMES` in eslint, see PRODUCT_CREATION_GUIDE).

---

## 4. Documentation for contributors

| Document | Purpose |
|----------|---------|
| `docs/ARCHITECTURE_BOUNDARIES.md` | Package vs app boundaries, allowed/forbidden in packages, TypeScript aliases, enforcement, exceptions. |
| `docs/PRODUCT_CREATION_GUIDE.md` | How to create a new product app (script, structure, Supabase, billing, analytics, Ops contract). |
| `docs/PACKAGE_GUIDELINES.md` | When to create a package, allowed/forbidden contents, package-to-package imports. |
| `docs/PRODUCT_MODULE_PATTERN.md` | Standard layout for `modules/auth`, `billing`, `analytics`, `domain` and how they use packages. |
| `docs/OPS_METRICS_CONTRACT.md` | Contract for `GET /api/ops/metrics` (product, users, activeSubscriptions, pendingCancellation, mrr). Ops dashboard not implemented. |
| `docs/GOVERNANCE_SUMMARY.md` | This summary. |

---

## 5. Validation results

- **Workspace build:** `pnpm run build:workspace` — **passed** (7 tasks: root + 6 apps).
- **Tests:** `pnpm run test:workspace` — **passed** (3 packages with tests: devflow, app-financeiro, billing-core; 130 + 130 + 13 tests).
- **Imports:** No new cross-boundary imports; existing code uses packages via `@devflow/*` or relative paths within the same app.
- **Apps:** All apps (site, financeiro, investigamais, funklab, whatsapp-platform, ops) and root build successfully.

---

## 6. Checklist for new products

After running `pnpm run create-product <name>`:

1. Run `pnpm install` from repo root.
2. Add the new app name to `APP_NAMES` in `eslint.config.mjs` for boundary rules.
3. Create a dedicated Supabase project (and DB) for the product.
4. Implement auth, billing, analytics, and domain per `docs/PRODUCT_MODULE_PATTERN.md`.
5. Optionally implement `GET /api/ops/metrics` per `docs/OPS_METRICS_CONTRACT.md`.
