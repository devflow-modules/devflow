# Application Lifecycle

Canonical V2 application lifecycle for ApplyFlow.

Authority: `@devflow/applyflow-core` (`APPLICATION_LIFECYCLE_TRANSITIONS`, `canTransitionApplicationStatus`, `transitionApplicationStatus`).

Do **not** add a second transition table in the app layer.

Related: [`PRODUCT_FLOW.md`](./PRODUCT_FLOW.md) · [`ARCHITECTURE.md`](./ARCHITECTURE.md)

---

## Pipeline states (V2)

| Status | Terminal? |
|--------|-----------|
| `found` | No |
| `qualified` | No |
| `applying` | No |
| `skipped` | Yes |
| `applied` | No |
| `recruiter_contacted` | No |
| `screening` | No |
| `technical` | No |
| `final` | No |
| `offer` | No |
| `hired` | Yes |
| `rejected` | Yes |
| `withdrawn` | Yes |

Allowed edges are defined in `APPLICATION_LIFECYCLE_TRANSITIONS` (e.g. `applied → screening|technical|…`, `offer → hired|rejected|withdrawn`). Same-status is allowed (no-op).

---

## V1 ↔ V2 mapping

Persisted Application rows use V1 funnel statuses; UI/pipeline uses V2.

Reuse `toPipelineStatusV2` / `fromPipelineStatusV2` only.

Lossy examples:

- V2 `screening` and `final` both persist as V1 `interview`
- V2 `offer` ↔ V1 `accepted`
- V2 `found` / `qualified` / `applying` ↔ V1 `reviewing`

---

## Local vs cloud

| Concern | Local | Cloud / Persistence V2 |
|---------|-------|-------------------------|
| Transition legality | `canTransitionApplicationStatus` | Same + server `assertStatusTransition` |
| Persist Application | localStorage + analytics | Prefer transactional lifecycle route |
| Linked Job sync | `sourceJobId` → mapped status | Same mapping inside `$transaction` |
| Career event timeline | Real local events possible | **Not available** on server |
| OCC | N/A / local semantics | `expectedVersion` |

### Transactional cloud path

`POST /api/applyflow/v2/applications/:id/lifecycle`

1. Validate transition
2. `$transaction`: OCC update Application → resolve linked Job by `sourceJobId` + account → OCC update Job
3. Return `{ application, job, jobSynced }`

Missing / foreign-tenant Job → Application may commit with `jobSynced=false`. Job OCC conflict rolls back the transaction (`version_conflict`) — no false full success.

---

## Concurrent transitions

Optimistic concurrency serializes writers. Stale `expectedVersion` → `version_conflict` (not last-write-wins).

---

## Job synchronization

Primary link: `application` ↔ `sourceJobId` / `v2.sourceJobId`.

No company/title/URL fuzzy matching.

---

## Mark sent

Register → Application reviewing-side · Job reviewing
Mark sent → Application applied · Job applied
No duplicate Application for the same `sourceJobId` (DB unique index when set).

---

## History policy

- Real local events → may render timeline
- Typical cloud → **current status only**
- Do **not** synthesize a fake timeline from `updatedAt` / notes

**Closed beta accepts:** current state reliable; historical transition timeline not server-authoritative.

---

## Next-action guidance

`deriveApplicationNextAction(...)` is pure derived UI:

- not persisted
- not a task / reminder / calendar item
- never auto-transitions or sends messages

---

## Privacy

Lifecycle transitions make **zero** provider requests. CV/notes/status do not leave the privacy boundary to Jobgether / TheirStack / Remote OK.

---

## Deferred

- Persisted nextAction workflow fields
- Server lifecycle event history table
- Automatic repair mutations on page render
