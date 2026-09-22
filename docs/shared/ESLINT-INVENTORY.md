# ESLint inventory (`eslint .`)

Snapshot from `origin/main` `1065e21d` on **2026-09-22**. Command: `pnpm exec eslint .` (JSON format). This is **not** a CI job. Do **not** treat a green `lint:ci` (Financeiro only) as coverage of this table.

Local `docs/security-audit/.venv` was linted in the raw run (matplotlib JS). Those findings are **noise** and are excluded from the product totals below. `eslint.config.mjs` now ignores `**/.venv/**`.

## Totals (excluding `.venv`)

| | Count |
| --- | ---: |
| Files with findings | 56 |
| Errors | 6 |
| Warnings | 66 |

## By area

| Area | Files | Errors | Warnings | Notes |
| --- | ---: | ---: | ---: | --- |
| `apps/financeiro` | 0 | 0 | 0 | Already in `lint:ci` |
| `apps/applyflow` | 0 | 0 | 0 | App linted in `test-applyflow` |
| `apps/whatsapp-platform` | 6 | 2 | 7 | Errors: `@next/next/no-html-link-for-pages` in admin billing/metrics clients |
| `apps/interview-lab` | 1 | 3 | 0 | `react-hooks/set-state-in-effect` in `interview-briefing-client.tsx` |
| `src` (portal) | 8 | 1 | 10 | Error: `@typescript-eslint/no-explicit-any` in `src/lib/audit.ts` |
| `apps/site` (legacy) | 13 | 0 | 16 | Warnings only |
| `apps/applyflow-extension` | 1 | 0 | 1 | |
| `apps/funklab` | 1 | 0 | 1 | |
| `apps/ops` | 1 | 0 | 1 | |
| `packages/applyflow-core` | 5 | 0 | 6 | |
| `packages/career-core` | 5 | 0 | 6 | |
| `packages/career-sync` | 9 | 0 | 16 | |
| `packages/career-agents` | 1 | 0 | 1 | |
| `templates/product-app` | 1 | 0 | 1 | |
| `docs/security-audit/.venv` | 3 | 5 | 17 | Local venv; ignored going forward |

## Error locations (product)

| Rule | Path |
| --- | --- |
| `react-hooks/set-state-in-effect` | `apps/interview-lab/src/components/interview-briefing-client.tsx` (3) |
| `@next/next/no-html-link-for-pages` | `apps/whatsapp-platform` admin `BillingDashboardClient.tsx`, `MetricsDashboardClient.tsx` |
| `@typescript-eslint/no-explicit-any` | `src/lib/audit.ts` |

## CI posture

- Keep [`ci.yml`](../../.github/workflows/ci.yml) `lint` as `pnpm lint:ci` (Financeiro).
- Do **not** add `eslint .` or `test:workspace` as required jobs until errors are 0 and a scoped job is proven green alone.
- Next scoped candidate after this inventory: WhatsApp `src/` (2 errors) or portal `src/lib/audit.ts` (1 error) — separate PRs.

## Out of band

- [#162](https://github.com/devflow-modules/devflow/pull/162) remains a **draft** mcp-builder quarantine. Not a product blocker. Triage merge/close separately.
