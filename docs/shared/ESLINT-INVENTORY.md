# ESLint inventory (`eslint .`)

Snapshot updated **2026-09-22** after clearing the 6 product errors (base `origin/main` `1c4878e5`). Command used for the original count: `pnpm exec eslint .` (JSON format). This is **not** a CI job. Do **not** treat a green `lint:ci` (Financeiro only) as coverage of this table.

Local `docs/security-audit/.venv` was linted in the raw run (matplotlib JS). Those findings are **noise** and are excluded from the product totals below. `eslint.config.mjs` now ignores `**/.venv/**`.

## Totals (excluding `.venv`)

| | Count |
| --- | ---: |
| Files with findings | 54 |
| Errors | 0 |
| Warnings | 66 |

Product errors cleared in this pass: WhatsApp admin `<a href>` page links, Interview Lab `set-state-in-effect`, portal `src/lib/audit.ts` `any`. File count drops by the two files that had **only** errors (`interview-briefing-client.tsx`, `src/lib/audit.ts`).

## By area

| Area | Files | Errors | Warnings | Notes |
| --- | ---: | ---: | ---: | --- |
| `apps/financeiro` | 0 | 0 | 0 | Already in `lint:ci` |
| `apps/applyflow` | 0 | 0 | 0 | App linted in `test-applyflow` |
| `apps/whatsapp-platform` | 6 | 0 | 7 | Admin billing/metrics page links now use `next/link` |
| `apps/interview-lab` | 0 | 0 | 0 | Briefing client no longer sets state in effects |
| `src` (portal) | 7 | 0 | 10 | `src/lib/audit.ts` typed as `PrismaClient` |
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

None remaining. Warnings (66) are out of band.

## CI posture

- Keep [`ci.yml`](../../.github/workflows/ci.yml) `lint` as `pnpm lint:ci` (Financeiro).
- Do **not** add `eslint .` or `test:workspace` as required jobs until a scoped job is proven green alone.
- Next scoped candidate: WhatsApp `src/` warnings or portal `src/` warnings — separate PRs.

## Out of band

- [#162](https://github.com/devflow-modules/devflow/pull/162) remains a **draft** mcp-builder quarantine. Not a product blocker. Triage merge/close separately.
