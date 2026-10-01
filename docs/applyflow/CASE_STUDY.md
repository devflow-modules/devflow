# ApplyFlow

**Invite-only closed beta** (10–50 users technically approved). Public signup is **not** approved. Paid production SaaS is **not** claimed.

Reading time: ~6 minutes. Product entry: [`apps/applyflow/README.md`](../../apps/applyflow/README.md).

This case study describes the **current** career workflow product (discovery → match → queue → readiness → lifecycle). It is not a sprint chronology.

---

## Problem

Job search for senior engineers is fragmented across:

- **Discovery** — several job boards with inconsistent filters and paywalls
- **Fit analysis** — gut feel, spreadsheets, or opaque “AI scores”
- **Preparation** — resume tweaks and checklists that live nowhere durable
- **Application tracking** — tabs, notes, and CRM-like sheets that diverge from what was actually sent

Aggressive tooling often collapses those steps into mass apply or auto-submit. That creates platform risk and a privacy problem when resumes leave the device early.

ApplyFlow does **not** claim a measured market-pain study from live beta users. The product is a deliberate engineering response to that fragmentation: keep recommendation advisory, keep human intent explicit, and keep sensitive profile data local by default.

---

## Product

ApplyFlow is a **local-first career workflow** for discovering opportunities, evaluating fit with a **deterministic Match Engine**, prioritizing a derived opportunity queue, preparing applications with readiness guidance, and tracking lifecycle after a real external submit — with **optional** authenticated Postgres persistence for invite-only V2 pilots.

It does **not** auto-apply or auto-submit.

---

## Workflow

```text
Discovery → Match Preview → Explicit Save → Opportunity Queue
  → Application Readiness → Register Application → Mark Sent
  → Application Lifecycle → Derived Next Action
```

| Step | Product meaning |
|------|-----------------|
| Match preview | Transient fit — **does not persist** |
| Save | Persists a **Job**, not an Application |
| Match decision | Advisory (`apply` / `stretch` / `needs_info` / `skip`) |
| Register | Creates **Application** — does **not** submit to employers |
| Mark sent | User asserts external submission happened |
| Next action | Derived UI guidance — not a task system |

Canonical semantics: [`PRODUCT_FLOW.md`](./PRODUCT_FLOW.md).

---

## Architecture

```text
Browser
 ├─ Resume / Profile (local by default)
 ├─ ApplyFlow UI
 ├─ Deterministic Match Engine (@devflow/applyflow-core)
 ├─ Local-first persistence
 └─ Optional V2 API → PostgreSQL (tenant-scoped, OCC)

ApplyFlow server → Jobgether · Remote OK · TheirStack (shared OFF)
```

**Boundary:** CV/profile are **not** sent on discovery provider requests. Search carries filters only.

Visual: [`assets/applyflow-architecture.svg`](./assets/applyflow-architecture.svg) · depth: [`ARCHITECTURE.md`](./ARCHITECTURE.md).

---

## Key Engineering Decisions

1. **Local-first CV/profile** — privacy and low friction before cloud convenience for resume content.
2. **Deterministic Match Engine** — skill coverage and thresholds in core; **not** an LLM scorer.
3. **Match recommendation ≠ user lifecycle** — advisory badges never mutate Application state alone.
4. **Derived opportunity queue** — `Job.status === reviewing`; no Shortlist entity.
5. **Readiness as guidance** — checklist over another persisted score/entity.
6. **Job ≠ Application** — save is not apply; register is not submit.
7. **Canonical lifecycle + OCC** — transactional Application↔Job transitions on V2; `expectedVersion` conflicts.
8. **TheirStack fail-safe** — credit provider disabled on shared hosts without a distributed limiter.

---

## Privacy

Factual engineering controls (not certifications):

- Server-derived account identity for V2
- Account-scoped persistence
- Cross-tenant Playwright isolation
- Origin checks on mutating routes
- Provider secrets server-side only
- CV/profile absent from discovery provider payloads
- Paid provider disabled on shared deploy without distributed rate limiting

Details: [`PRIVACY_SECURITY.md`](./PRIVACY_SECURITY.md). No “enterprise secure / OWASP / LGPD compliant” claim.

---

## Multi-Tenant Persistence

| | Local-first | V2 (pilot) |
|--|-------------|------------|
| Auth | Optional for many flows | Required |
| Jobs / Applications | Browser storage | PostgreSQL, `accountId` scoped |
| Resume / profile | Local | Still local |
| Gate | Default | Feature flag + `pilotEligible` + activation |

V2 is a **persistence mode**, not “sync everything.” Unique `(accountId, sourceJobId)` guards duplicates. See [`PERSISTENCE_V2.md`](./PERSISTENCE_V2.md).

---

## Lifecycle & Consistency

After Mark Sent, the UI exposes a canonical pipeline (screening, technical, offer, …) with **next-action** guidance derived from current state. Cloud mutations use optimistic concurrency; lifecycle transitions that must keep Job and Application aligned run transactionally on the V2 path.

There is **no** server-side event-history table yet — current-state cloud only. That is intentional scope control, not an unfinished promise of a timeline product.

---

## Provider Integrations

| Provider | Posture |
|----------|---------|
| Jobgether | Default free discovery |
| Remote OK | Cached catalog; attribution required |
| TheirStack | Credit-based; **OFF on shared Vercel** without distributed limiter |

Adapters normalize hits behind one search contract. Secrets never ship to the browser. [`JOB_DISCOVERY.md`](./JOB_DISCOVERY.md).

---

## Reliability / Testing

Baseline tied to commit **`f599ea03`** (design-system consolidation; product semantics unchanged from prior closed-beta baseline):

| Layer | Result |
|-------|--------|
| `@devflow/applyflow-core` | **475 passed** |
| ApplyFlow Vitest | **1419 passed** / 30 skipped |
| Local Playwright E2E | **2 passed** |
| V2 Playwright E2E | **2 passed** |
| Typecheck / lint / build | **PASS** |

Re-validate after material code changes. Authoritative suite notes: [`TESTING.md`](./TESTING.md).

---

## Production Readiness

| Gate | Status |
|------|--------|
| Invite-only closed beta (10–50 technically approved) | Approved for operators |
| Public signup | **Not** approved |
| Paid production SaaS | **Not** approved |

Controls and blockers: [`PRODUCTION_READINESS.md`](./PRODUCTION_READINESS.md) · ops: [`CLOSED_BETA_RUNBOOK.md`](./CLOSED_BETA_RUNBOOK.md).

---

## Trade-offs

| Decision | Why | Cost |
|----------|-----|------|
| TheirStack OFF shared | Protect credits without Redis | Reduced provider availability on shared hosts |
| No server lifecycle history | Avoid premature event model | Current-state cloud only |
| Local-first profile | Stronger privacy | Less cross-device resume convenience |
| Derived queue / readiness | Fewer entities; clearer Job vs Application | No persisted Shortlist/Preparation |
| Match ≠ intent | Humans own lifecycle | Extra UI education |
| Explicit Mark Sent | No auto-apply | User must confirm external submit |

---

## Current Status

- Product workflow surfaces are screenshot-ready for portfolio packaging
- Closed beta is invite-only; **no fabricated active-user or conversion metrics**
- Companion Chrome extension remains an assisted Easy Apply path (**no auto-submit**)

Unsafe claims list: [`CAREER_EVIDENCE.md`](./CAREER_EVIDENCE.md).

---

## Screenshots

Fictional / fixture data only. Capture script: `apps/applyflow/scripts/capture-portfolio-screenshots.cjs`.

| Asset | Surface |
|-------|---------|
| [`assets/applyflow-landing.png`](./assets/applyflow-landing.png) | Landing / positioning |
| [`assets/applyflow-discovery.png`](./assets/applyflow-discovery.png) | Discovery + match preview |
| [`assets/applyflow-queue.png`](./assets/applyflow-queue.png) | Opportunity queue |
| [`assets/applyflow-readiness.png`](./assets/applyflow-readiness.png) | Analysis + readiness |
| [`assets/applyflow-lifecycle.png`](./assets/applyflow-lifecycle.png) | Lifecycle (screening) |
| [`assets/applyflow-applications.png`](./assets/applyflow-applications.png) | Applications table |
| [`assets/applyflow-architecture.svg`](./assets/applyflow-architecture.svg) | Architecture diagram |

---

## Engineering Takeaways

- Separate **recommendation** from **intent** early — it simplifies domain and reduces unsafe automation pressure.
- Prefer **derived views** (queue, readiness, next action) until persistence of a new entity is clearly justified.
- Treat paid third-party discovery as a **cost-control problem**, not only a feature checkbox.
- Local-first is a product boundary, not a temporary stub — cloud should earn its complexity.
- Prove tenant isolation with E2E, not with “auth exists” alone.

Demo walkthrough: [`DEMO_SCRIPT.md`](./DEMO_SCRIPT.md).
