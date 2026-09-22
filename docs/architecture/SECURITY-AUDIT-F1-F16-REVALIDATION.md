# Security audit F1–F16 — revalidation

Snapshot of [`docs/security-audit/generate_report.py`](../security-audit/generate_report.py) dated **2026-08-28**. That generator is evidence, not a runtime contract. Revalidated against `origin/main` at `4f0c784` on **2026-09-22**.

**No production database was queried. No migration was created or applied.** Prisma owner connections ignore RLS unless `FORCE ROW LEVEL SECURITY`; Next.js isolation remains session + Prisma filters.

## Status

| ID | Original | Revalidation | Action |
| --- | --- | --- | --- |
| F1 | WhatsApp RLS `USING (true)` | Confirmed in repo | **BLOCK** migration until explicit approval |
| F2 | Investigamais Allow-all RLS | Still scaffold | Defer |
| F3 | Financeiro Account/Settlement RLS sidecar only | Confirmed in repo | **BLOCK** migration until explicit approval |
| F4 | PATCH phone-number without manager role | Confirmed, then fixed | [PR #230](https://github.com/devflow-modules/devflow/pull/230) |
| F5 | Investigamais webhook without auth | Still scaffold | Defer |
| F6 | Admin APIs open in `NODE_ENV=development` | Informative | No PR |
| F7 | WhatsApp `pnpm dev` JWT fallback | Informative | No PR |
| F8 | `SKIP_ENV_VALIDATION=1` | Informative | No PR |
| F9 | Interview Lab `new Function` | Internal MVP | Defer |
| F10 | Blog `dangerouslySetInnerHTML` from git HTML | Not visitor-exploitable | No PR |
| F11–F14 | Financeiro FK / OWNER gaps | Confirmed, then fixed | [PR #226](https://github.com/devflow-modules/devflow/pull/226) |
| F15 | Activation script PIN default `123456` | Confirmed, then fixed | [PR #231](https://github.com/devflow-modules/devflow/pull/231) |
| F16 | Meta Pixel snippet | Informative | No PR |

## F1 — WhatsApp RLS is theatrical

Still present:

- [`apps/whatsapp-platform/prisma/migrations/20260327000000_supabase_conversations_messages/migration.sql`](../../apps/whatsapp-platform/prisma/migrations/20260327000000_supabase_conversations_messages/migration.sql) lines 34–41: `conversations` / `messages` enable RLS, then `USING (true) WITH CHECK (true)`.
- [`apps/whatsapp-platform/prisma/migrations/20260322000000_webhook_logs/migration.sql`](../../apps/whatsapp-platform/prisma/migrations/20260322000000_webhook_logs/migration.sql) lines 14–17: same pattern on `webhook_logs`.
- [`apps/whatsapp-platform/supabase/schema.sql`](../../apps/whatsapp-platform/supabase/schema.sql) lines 102–118: same for tenants, queues, agents, assignments.

Canonical isolation remains JWT `tenantId` + Prisma `where: { tenantId }`. The Next.js app uses a privileged DB role, so these policies do not constrain the app. They also do not constrain PostgREST if `anon` / `authenticated` still have `GRANT`.

**Proposed fix (not applied):** replace allow-all policies with `tenant_id` predicates (or `REVOKE` PostgREST roles like Financeiro 20260202192423). Requires human approval, a non-destructive Prisma migration, rollback via policy drop/recreate, and a live GRANT inventory before apply.

## F3 — Financeiro Account/Settlement RLS is not in the pipeline

Still present:

- [`apps/financeiro/prisma/sql/RLS_FINANCEIRO.sql`](../../apps/financeiro/prisma/sql/RLS_FINANCEIRO.sql) defines `is_household_member` and policies for Account, Settlement, Payment, splits, reversals, snapshots. It is **not** a Prisma migration.
- [`apps/financeiro/prisma/migrations/20260318000001_add_accounts_split_hybrid/migration.sql`](../../apps/financeiro/prisma/migrations/20260318000001_add_accounts_split_hybrid/migration.sql) (and later Payment/Settlement/Reversal/Snapshot migrations) create those tables **without** `ENABLE ROW LEVEL SECURITY`.
- Hardening [`20260202192423_supabase_security_hardening`](../../apps/financeiro/prisma/migrations/20260202192423_supabase_security_hardening/migration.sql) does `REVOKE` + `ENABLE RLS` on the older tables and sets `ALTER DEFAULT PRIVILEGES … REVOKE ALL ON TABLES FROM anon, authenticated`. New tables created by the **same** role after that date may inherit the revoke. That is not the same as tenant policies or `ENABLE RLS` in the migration history.

Canonical isolation remains `requireHouseholdMembership` + `householdId` in services (strengthened for client FKs in PR #226).

**Proposed fix (not applied):** promote a reviewed subset of `RLS_FINANCEIRO.sql` to an additive migration (`ENABLE RLS` + policies, no `FORCE` unless approved). Confirm live PostgREST grants first. Do not apply from this PR.

## F4 / F11–F15

Code fixes ship in unit PRs listed above. Merge those independently. This document does not change runtime behavior.

## Deferred / informative

Do not mix F2, F5, F9 (scaffold / internal) or F6, F7, F8, F10, F16 (informative) into IDOR or RLS PRs.
