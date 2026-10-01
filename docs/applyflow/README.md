# ApplyFlow documentation

Authoritative docs for the ApplyFlow product in this monorepo.

**Entry point:** [`apps/applyflow/README.md`](../../apps/applyflow/README.md)

**Current release:** invite-only **10–50 user closed beta**. Public signup **not** approved.

## Public / portfolio

| Document | Purpose |
|----------|---------|
| [`../apps/applyflow/README.md`](../../apps/applyflow/README.md) | Project entry (3–5 minutes) |
| [`PRODUCT_FLOW.md`](./PRODUCT_FLOW.md) | Discovery → lifecycle semantics |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | System design, local-first vs V2 |
| [`JOB_DISCOVERY.md`](./JOB_DISCOVERY.md) | Providers, Match Engine, queue, readiness |
| [`APPLICATION_LIFECYCLE.md`](./APPLICATION_LIFECYCLE.md) | Canonical lifecycle + Job sync |
| [`PRIVACY_SECURITY.md`](./PRIVACY_SECURITY.md) | Engineering privacy / security model |
| [`TESTING.md`](./TESTING.md) | Vitest, E2E, CI baseline |

## Operations / maintainer

| Document | Purpose |
|----------|---------|
| [`PRODUCTION_READINESS.md`](./PRODUCTION_READINESS.md) | Release level, controls, blockers |
| [`CLOSED_BETA_RUNBOOK.md`](./CLOSED_BETA_RUNBOOK.md) | Invite, backup, rollback, incidents |
| [`BACKUP_RESTORE.md`](./BACKUP_RESTORE.md) | Drill + closed-beta cadence |
| [`PERSISTENCE_V2.md`](./PERSISTENCE_V2.md) | V2 persistence deep reference |
| [`PERSISTENCE_V2_FIRST_PRODUCTION_PILOT_RUNBOOK.md`](./PERSISTENCE_V2_FIRST_PRODUCTION_PILOT_RUNBOOK.md) | Pilot operator depth |
| [`PERSISTENCE_V2_MIGRATION_RUNBOOK.md`](./PERSISTENCE_V2_MIGRATION_RUNBOOK.md) | V1→V2 migration ops |

## Internal / career

| Document | Purpose |
|----------|---------|
| [`BETA_EVIDENCE.md`](./BETA_EVIDENCE.md) | Empty metrics template (no fabricated numbers) |
| [`CAREER_EVIDENCE.md`](./CAREER_EVIDENCE.md) | Interview/CV claims grounded in the repo |
| [`APPLYFLOW_ENGINEERING_CASE.md`](./APPLYFLOW_ENGINEERING_CASE.md) | Longer engineering narrative (historical depth) |
| ADRs (`ADR-*.md`) | Decision records |

## Companion

| Document | Purpose |
|----------|---------|
| [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md) | UI tokens / components |
| [`ANALYTICS_MODEL.md`](./ANALYTICS_MODEL.md) | Local analytics model |
| [`SCREENSHOTS_CHECKLIST.md`](./SCREENSHOTS_CHECKLIST.md) | Capture checklist |
| [`assets/README.md`](./assets/README.md) | Asset naming |

Historical case studies, LinkedIn drafts, and phase closeouts remain in this folder for Git history / narrative — they are **not** the release-status source of truth. Prefer this index + the app README.
