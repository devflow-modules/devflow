# ApplyFlow — career / interview evidence (internal)

Internal translation of repository evidence into **defensible** interview and CV claims.

Not a public marketing page. Do not paste private resume content here.

Related public entry: [`apps/applyflow/README.md`](../../apps/applyflow/README.md)

---

## Proven by repository

- Multi-provider job discovery with server adapters and fail-closed TheirStack shared policy
- Deterministic Match Engine in `@devflow/applyflow-core` (skill coverage / thresholds — **not** an LLM)
- Explicit Job vs Application domain split; derived opportunity queue without a Shortlist entity
- Local-first default + optional V2 Postgres persistence with pilot gate
- OCC on cloud mutations; transactional Application↔Job lifecycle endpoint
- Playwright E2E for local-first and multi-account V2 isolation
- Backup/restore drill and closed-beta operator runbooks

Baseline tests: see [`TESTING.md`](./TESTING.md) (SHA `f599ea03`). Portfolio narrative: [`CASE_STUDY.md`](./CASE_STUDY.md).

---

## Architecture decisions (interview-ready)

1. Local CV privacy vs cloud convenience
2. Disable paid provider on shared hosts vs introducing Redis only for quotas
3. Derived queue/readiness vs more persisted entities
4. Match recommendation separated from human intent
5. Current-state cloud lifecycle without server event-history table
6. Explicit Mark Sent vs auto-apply

Details also in the app README trade-offs table.

---

## Reliability evidence

- Unique index on `(accountId, sourceJobId)` for Applications
- Concurrent transition conflict tests / OCC
- Backup drill green on local Docker
- CI job with Postgres + local/V2 E2E

---

## Security / privacy evidence

- Tenant isolation E2E (Account B cannot read/mutate A)
- CV not on discovery request path
- Origin guards on mutating routes
- Error payload redaction tests

No GDPR/LGPD certification claim.

---

## Product ownership evidence

- Closed-beta release gate with explicit public-signup blockers
- Operator runbook (grant/revoke, backup, rollback, incident stops)
- Honest limitation list (TheirStack shared off, no cloud timeline, etc.)

---

## Metrics safe to quote

- Provider integrations implemented: Jobgether, Remote OK, TheirStack (gated)
- Persistence modes: local-first + V2 cloud
- Test/E2E counts from a dated SHA (always cite SHA)
- Lifecycle: canonical V2 pipeline states in core

---

## Claims NOT safe to make yet

- Production user counts / conversion / time-saved / response-rate lift
- “AI Match Engine” / “GPT-powered matching” for the core scorer
- “Fully production-ready SaaS” / public signup ready
- Uptime SLA / enterprise security certification
- Managed PITR proven (unless operator verification is recorded)
- Auto-apply or LinkedIn ToS circumvention

---

## Suggested one-liner (English)

> Built a local-first career workflow with deterministic matching, multi-provider discovery, and a pilot-gated Postgres persistence layer with tenant isolation E2E and closed-beta release controls — without claiming public SaaS readiness.
