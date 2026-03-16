# @devflow/package-name

Shared package template for the DevFlow monorepo.

## Rules for shared packages

- **Allowed:** Reusable utilities, provider adapters (Stripe, Supabase, etc.), UI primitives, shared types, infrastructure helpers, analytics contracts, testing helpers.
- **Forbidden:** Product business logic, database queries, product-specific plans, product-specific APIs, product dashboards.

See [PACKAGE_GUIDELINES.md](../../docs/PACKAGE_GUIDELINES.md) and [ARCHITECTURE_BOUNDARIES.md](../../docs/ARCHITECTURE_BOUNDARIES.md).

## Usage

1. Copy this template to `packages/<name>/`.
2. Rename package in `package.json` to `@devflow/<name>`.
3. Add to `pnpm-workspace.yaml` scope (already covered by `packages/*`).
4. Implement only shared, product-agnostic code in `src/`.
5. Export public API from `src/index.ts`.
