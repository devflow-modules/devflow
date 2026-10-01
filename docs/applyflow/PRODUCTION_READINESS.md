# ApplyFlow — Production Readiness

**Current approved release level:** invite-only **closed beta (10–50 users)** via V2 pilot gate.

**Not approved:** public signup · paid multi-tenant production SaaS.

Related: [`CLOSED_BETA_RUNBOOK.md`](./CLOSED_BETA_RUNBOOK.md) · [`BACKUP_RESTORE.md`](./BACKUP_RESTORE.md) · [`TESTING.md`](./TESTING.md) · [`PRIVACY_SECURITY.md`](./PRIVACY_SECURITY.md)

---

## Current release level

| Cohort | Status |
|--------|--------|
| Local-first personal use | Supported |
| Invite-only closed beta **10–50** (V2/cloud) | **APPROVED** (Phase 9D) |
| Public signup / open beta | **NOT APPROVED** |
| Paid production SaaS | **NOT APPROVED** |

Conditions for 10–50 closed beta:

- V2 pilot eligibility is server-authoritative
- TheirStack **OFF** on shared hosted deploy
- Operator-owned backup cadence (or verified managed PITR)
- Error tracking DSN configured by operator before inviting (or accepted warn)
- No public signup funnel

---

## Closed-beta controls

| Control | Status |
|---------|--------|
| Auth + server-derived account | Yes |
| Tenant-scoped Jobs/Applications | Yes (+ V2 E2E) |
| OCC (`expectedVersion`) | Yes |
| Transactional App↔Job lifecycle | Yes (`…/lifecycle`) |
| Origin allowlist (search + V2 mutations) | Yes |
| Security headers baseline | Yes |
| TheirStack shared disable | Yes |
| Provider secrets server-only | Yes |
| Error redaction | Yes |
| E2E production-target guards | Yes |
| Backup/restore drill (local) | Yes |
| Broad CSRF tokens | Deferred |
| Strict CSP | Deferred |
| Self-service deletion | Deferred |
| Managed PITR verified | Operator checklist only |

---

## Required operator configuration

Names only (never paste values into docs/issues):

| Variable | Role |
|----------|------|
| `DATABASE_URL` / `DIRECT_URL` | V2 Postgres (local Docker for drills) |
| `APPLYFLOW_PERSISTENCE_V2` | Enable V2 mode |
| `NEXT_PUBLIC_APPLYFLOW_URL` | Origin allowlist (required hosted) |
| `APPLYFLOW_THEIRSTACK_ENABLED` | Must stay false/off on shared |
| `THEIRSTACK_API_KEY` | Server-only; unused when disabled |
| `APPLYFLOW_SENTRY_DSN` or `SENTRY_DSN` | Operator action for observability |
| Supabase public + auth vars | Real user sessions |

E2E-only (never on Vercel platform): `APPLYFLOW_E2E`, `APPLYFLOW_E2E_SECRET`, `APPLYFLOW_E2E_PROVIDER_FIXTURES`, `APPLYFLOW_E2E_IGNORE_SUPABASE`.

Preflight: `pnpm --filter applyflow beta:check`

---

## Known accepted risks (closed beta)

- TheirStack unavailable on shared hosts (intentional)
- No server-authoritative lifecycle event timeline
- Resume/profile largely local-first even in V2
- Manual backup ownership if PITR not verified
- Process-local TheirStack quota is not multi-instance safe (when enabled personally)
- Invite-only Origin/SameSite posture vs full CSRF tokens

---

## Public beta blockers

- Public signup / abuse controls
- Broad CSRF (beyond Origin) and/or strict CSP as required by threat model
- Self-service data deletion
- Managed backup/PITR verified (or stronger automation)
- Distributed TheirStack limiter **or** permanent product disable
- Stronger observability (DSN + triage runbooks at scale)
- Account lifecycle / support tooling

---

## Paid production blockers

All public-beta blockers, plus billing, SLAs, multi-region ops, formal compliance program (out of scope here), and production change management beyond closed-beta runbooks.

---

## Validation baseline

See [`TESTING.md`](./TESTING.md) — baseline SHA `5636feef`.

---

## Answer in one line

**Yes — safely for invite-only 10–50 closed-beta users under the controls above. Not for public signup.**
