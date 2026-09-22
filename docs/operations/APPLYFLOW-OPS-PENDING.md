# ApplyFlow ops — pending explicit authorization

This file is the Fase 6 hold. It inventories **environment variable names** from repo contracts and records what must not start without a human go-ahead.

**Done (Gate A, 2026-09-22):** fast-forward `production` → `main` @ `23d8c8de7e02` after Preview smoke. Vercel Production deployed from the `production` branch (not `vercel --prod`).

**Not done from this program:** Vercel dashboard mutation, secret create/rotate, `vercel --prod`, Gmail/Nango enablement, or the real inbound classifier on customer mail.

Live Vercel env **values** were **not** pulled (`vercel env ls` shows `Encrypted` only). Names below are a snapshot, not a go-ahead to enable Gmail.

## Hosts (redacted)

| Surface | Project | Git branch that deploys it | Public alias |
| --- | --- | --- | --- |
| ApplyFlow Preview | `devflow-applyflow` (root directory `apps/applyflow`) | feature branches and `main` | Vercel preview URLs |
| ApplyFlow Production | same project | **`production` only** | `https://devflow-applyflow.vercel.app` |
| Portal / Financeiro / WhatsApp | other Vercel projects | typically `main` | production hosts of those products |

Merge to `main` can redeploy portal, Financeiro, and WhatsApp. It must **not** move ApplyFlow Production.

## Promotion status (2026-09-22)

| Ref | SHA (12) | Notes |
| --- | --- | --- |
| `origin/main` | `23d8c8de7e02` | Merge #238 (eslint inventory) after #237 |
| `origin/production` | `23d8c8de7e02` | Gate A: ff-only from `530e98b8e44b` |
| Delta | 0 commits | `origin/production` matches `origin/main` |

Preview smoke (`dpl_Fz1xcSn6szcgCNdeeRLSt59wHBib`, SHA `23d8c8de7e02`): `livez` alive; `readyz` `200 ready`; `health` and `health?probe=true` `healthy`; `provider_metadata` / `career_llm` / `database` disabled.

Production smoke (`dpl_Cx1akRXFEZfspHT3Df2kV25gHCfw`, branch `production`, alias `https://devflow-applyflow.vercel.app`): `readyz` `200 ready` (`environment=production`); `health` `healthy`; `provider_metadata` / `career_llm` / `database` disabled. Career Chat remains disabled on Production.

Safe follow-up promotions stay the runbook in [`docs/career-suite/DEPLOYMENT.md`](../career-suite/DEPLOYMENT.md): fast-forward `production` to `main`, never `vercel deploy --prod` during the pilot.

## Env names — Preview (expected)

From [`docs/career-suite/DEPLOYMENT.md`](../career-suite/DEPLOYMENT.md) and [`apps/applyflow/.env.example`](../../apps/applyflow/.env.example). Names only.

| Name | Role | Preview posture |
| --- | --- | --- |
| `CAREER_RUNTIME_ENVIRONMENT` | server | `preview` |
| `CAREER_AGENTS_ENABLED` | server | on |
| `CAREER_PILOT_MODE` | server | on |
| `NEXT_PUBLIC_CAREER_PILOT_MODE` | client | on |
| `CAREER_SYSTEM_STATUS_ENABLED` | server | optional on preview |
| `CAREER_LLM_ENABLED` | server | off |
| `CAREER_LLM_PROVIDER` | server | `mock` |
| `LIBRECHAT_ADAPTER_ENABLED` | server | on for Career Chat |
| `LIBRECHAT_TRANSPORT_ENABLED` | server | off |
| `CAREER_AUTOMATION_ENABLED` | server | off |
| `CAREER_AUTOMATION_PROVIDER` | server | `mock` |
| `OPENCLAW_ENABLED` | server | off |
| `NEXT_PUBLIC_APP_VERSION` | client | `preview` |
| `NEXT_PUBLIC_BUILD_TIMESTAMP` | client | ISO, optional |
| `NEXT_PUBLIC_APPLYFLOW_URL` | origin allowlist | preview https origin |
| `VERCEL_URL` | platform | injected per deployment |
| `VERCEL_GIT_COMMIT_SHA` | platform | injected; do not pin `NEXT_PUBLIC_COMMIT_SHA` |

**Keep absent on Preview:** `DATABASE_URL`, `OPENAI_API_KEY`, `LIBRECHAT_API_KEY`, `LIBRECHAT_BASE_URL`, `NANGO_SECRET_KEY`, `OPENCLAW_API_KEY`, `OPENCLAW_BASE_URL`, `CAREER_PROVIDER_RUNTIME_ENABLED`, `NANGO_RUNTIME_ENABLED`, `GMAIL_PROVIDER_ENABLED`, `CALENDAR_PROVIDER_ENABLED`.

## Env names — Production (expected)

Same name set as Preview. Production must stay fail-closed for providers:

| Name | Production posture until authorized |
| --- | --- |
| `CAREER_PROVIDER_RUNTIME_ENABLED` | absent / not `true` |
| `NANGO_RUNTIME_ENABLED` | absent / not `true` |
| `GMAIL_PROVIDER_ENABLED` | absent / not `true` |
| `CALENDAR_PROVIDER_ENABLED` | absent / not `true` |
| `NANGO_SECRET_KEY` | absent |
| `CAREER_LLM_ENABLED` | off |
| `LIBRECHAT_TRANSPORT_ENABLED` | off |
| `OPENCLAW_ENABLED` | off |
| `CAREER_SYSTEM_STATUS_ENABLED` | explicit if `/dashboard/system-status` is required |
| `NEXT_PUBLIC_APPLYFLOW_URL` | production https origin when Nango is later enabled |
| `DATABASE_URL` | absent unless persistence is separately approved |

## Live names snapshot (2026-09-22, `devflow-applyflow`)

`vercel env ls` against the linked ApplyFlow project. **Names and target environments only.** No values.

| Name | Listed on |
| --- | --- |
| `CAREER_RUNTIME_ENVIRONMENT` | Preview |
| `CAREER_AGENTS_ENABLED` | Preview |
| `CAREER_PILOT_MODE` | Preview |
| `NEXT_PUBLIC_CAREER_PILOT_MODE` | Preview |
| `CAREER_SYSTEM_STATUS_ENABLED` | Preview |
| `CAREER_LLM_ENABLED` | Preview |
| `CAREER_LLM_PROVIDER` | Preview |
| `LIBRECHAT_ADAPTER_ENABLED` | Preview |
| `LIBRECHAT_TRANSPORT_ENABLED` | Preview |
| `CAREER_AUTOMATION_ENABLED` | Preview |
| `CAREER_AUTOMATION_PROVIDER` | Preview |
| `OPENCLAW_ENABLED` | Preview |
| `NEXT_PUBLIC_APP_VERSION` | Preview |
| `NEXT_PUBLIC_BUILD_TIMESTAMP` | Preview |
| `NEXT_PUBLIC_APPLYFLOW_URL` | Production |
| `CAREER_PROVIDER_RUNTIME_ENABLED` | Preview, Production |
| `NANGO_RUNTIME_ENABLED` | Preview, Production |
| `GMAIL_PROVIDER_ENABLED` | Preview, Production |
| `CALENDAR_PROVIDER_ENABLED` | Preview, Production |

**Absent from the list (fail-closed for real Gmail):** `NANGO_SECRET_KEY`, `DATABASE_URL`, `OPENAI_API_KEY`, `LIBRECHAT_API_KEY`, `LIBRECHAT_BASE_URL`, `OPENCLAW_API_KEY`, `OPENCLAW_BASE_URL`, `NEXT_PUBLIC_COMMIT_SHA`.

**Drift vs name contract:** the four provider flags are **present** on Preview and Production. The contract still says keep them absent / not `true` until Gate B. Values were not read. Gate A does **not** authorize enabling Gmail or Calendar. Do not `vercel env rm` from this program without a separate order.

## Gmail enablement (blocked)

Runbook: [`docs/career-suite/integrations/NANGO-SANDBOX-RUNTIME-VALIDATION-RUNBOOK.md`](../career-suite/integrations/NANGO-SANDBOX-RUNTIME-VALIDATION-RUNBOOK.md).

All four must be set together; missing any one fails closed:

1. `CAREER_PROVIDER_RUNTIME_ENABLED`
2. `NANGO_RUNTIME_ENABLED`
3. `GMAIL_PROVIDER_ENABLED`
4. `NANGO_SECRET_KEY`

Do **not** turn on `CALENDAR_PROVIDER_ENABLED` for Gmail-only. Do **not** write the secret into git, issues, or this file.

## Real inbound classifier (blocked)

The Gmail metadata classifier (`gmail-runtime-classifier.ts`, Rule A `provider_email_activity`) stays behind the same gates. It must not run against real mailboxes until Gmail enablement is approved. It does not infer application/interview/offer/rejection and must not persist raw mail.

## Authorization checklist

Copy when requesting a go-ahead:

- [x] Confirm ApplyFlow Production branch is still `production`
- [x] Inventory live Vercel **names only** (Preview vs Production) against the tables above (2026-09-22 snapshot; flags present, `NANGO_SECRET_KEY` absent)
- [x] Fast-forward `production` to `23d8c8de7e02` (Gate A)
- [x] Smoke Preview of that SHA before promotion
- [ ] Decide Gmail flags + `NANGO_SECRET_KEY` (fail-closed if any missing)
- [ ] Decide whether the real classifier may run after Gmail is on
