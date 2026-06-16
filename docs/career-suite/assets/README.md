# Career Suite — Screenshot assets

Screenshots for the [product and architecture case](../CAREER-SUITE-PRODUCT-AND-ARCHITECTURE-CASE.md) and portfolio materials.

**Status:** capture checklist only — no Career Suite–specific screenshots committed yet.

ApplyFlow general screenshots exist at [`docs/applyflow/assets/`](../../applyflow/assets/) (dashboard, analytics, table). Provider-derived flow screenshots below are **pending capture**.

---

## Capture checklist

Use **demo/sandbox data only**. No real emails, employer names from live accounts, API keys, tokens, or provider raw payloads.

| File (target) | Route / screen | Required state | Suggested size | Allowed data | Forbidden data |
|---------------|----------------|----------------|----------------|--------------|----------------|
| `applyflow-dashboard.png` | ApplyFlow `/dashboard` | Demo loaded | 1440×900 | Fictional demo applications | Real LinkedIn history, PII |
| `provider-derived-review.png` | Dashboard — provider review panel | Runtime preview loaded (flags on) | 1440×900 | Sandbox signals | Provider raw, subjects, bodies |
| `career-insights.png` | Dashboard — career insights panel | In-memory signals present | 1440×900 | Aggregated counts | Signal content with PII |
| `enrichment-change-preview.png` | Dashboard — change preview | Ready proposal + baseline | 1440×900 | Safe display values | Full proposal JSON |
| `export-composition-source.png` | Dashboard — composition source badge | `provider-derived-proposal` or `demo` | 1440×900 | Source kind label | Internal IDs |
| `interview-lab-handoff.png` | Interview Lab `/import/applyflow` | Post-handoff or fixture import | 1440×900 | Demo CareerBundle summary | Real candidate data |

### Capture steps

1. Build packages: `pnpm --filter @devflow/career-core build && pnpm --filter @devflow/career-sync build`
2. ApplyFlow: `pnpm --filter applyflow dev` → `http://localhost:3010/dashboard` → **Carregar demo**
3. For provider-derived panels: enable documented feature flags and consent mocks per [REAL-PROVIDER-RUNTIME-READINESS-CHECKLIST.md](../integrations/REAL-PROVIDER-RUNTIME-READINESS-CHECKLIST.md)
4. Interview Lab: `pnpm --filter @devflow/app-interview-lab dev` → `http://localhost:3015/import/applyflow`
5. Crop browser chrome; blur any accidental PII before commit

### Reuse existing ApplyFlow assets

These may be referenced from the case doc until provider-derived captures exist:

- [`docs/applyflow/assets/02-applyflow-dashboard-overview.png`](../../applyflow/assets/02-applyflow-dashboard-overview.png)
- [`docs/applyflow/assets/04-applyflow-applications-table.png`](../../applyflow/assets/04-applyflow-applications-table.png)
