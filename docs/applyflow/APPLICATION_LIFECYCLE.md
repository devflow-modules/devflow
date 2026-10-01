# Application Lifecycle (Phase 8)

## Canonical V2 state machine

Authority lives in `@devflow/applyflow-core`:

- `APPLICATION_LIFECYCLE_TRANSITIONS`
- `canTransitionApplicationStatus`
- `transitionApplicationStatus` (local: events + outcomes)

Do **not** add a second transition table in the app layer.

## Local vs cloud

| Concern | Local | Cloud / Persistence V2 |
|--------|--------|-------------------------|
| Transition legality | `canTransitionApplicationStatus` | Same helper (client) + `assertStatusTransition` in application service |
| Persist Application | localStorage + analytics | Prefer `POST .../applications/:id/lifecycle` (transactional) |
| Linked Job sync | `sourceJobId` → mapped V1 status | Same mapping inside the transaction when Job exists |
| Career event timeline | Real `ApplicationCareerEvent` rows | **Not available** — no server event table |
| Outcome timestamps | Real outcome fields | Cloud may expose `appliedAt` when the API has it |

Parity means **same domain rules**, not identical historical evidence.

## App ↔ Job transactional policy (Phase 9D)

Canonical cloud path:

1. Validate transition
2. `$transaction`: OCC update Application → resolve linked Job by `sourceJobId` + account → OCC update Job status
3. Return `{ application, job, jobSynced }`

Missing / foreign-tenant linked Job → Application commits, `jobSynced=false` (no cross-account mutation).

Job OCC conflict → whole transaction rolls back (`version_conflict`) — no false full success.

Fallback two-step adapters still report `job_sync_incomplete` honestly when Job sync fails after Application success.

## Concurrent transitions

Optimistic concurrency (`expectedVersion`) serializes writers. Stale concurrent transitions fail with `version_conflict` — not last-write-wins.

## Job synchronization

Primary link: `application.v2.sourceJobId`.

No company/title/URL fuzzy matching.

If the linked Job is missing, the Application transition may still succeed; UI reports incomplete sync when applicable.

## Mark sent

Register → Application `reviewing` / Job `reviewing`  
Mark sent → Application `applied` / Job `applied`  
No duplicate Application.

## History policy

- If real events exist → render timeline
- If not (typical cloud) → show current status only; do **not** synthesize events from `updatedAt` / status / notes

**Closed beta accepts:** current state reliable; historical transition timeline not server-authoritative.

## Next-action guidance

`deriveApplicationNextAction(...)` is **pure derived UI guidance**:

- not persisted (`nextAction` / `nextActionAt` are not Application workflow fields)
- not a task, reminder, or scheduler
- never auto-transitions, never sends follow-up, never creates contacts
- human decides whether to act

Note: `application.v2.nextActionAt` may exist for networking contacts metadata — it is **not** Phase 8 Application next-action guidance.

## Date semantics

- `createdAt` → “Registrada há X dias”
- `updatedAt` → “Atualizada há X dias” / stale “Sem atualização há X dias”
- `appliedAt` → “Aplicada há X dias” **only** when a real applied timestamp exists
- Never label `updatedAt` as applied or as employer non-response

## Privacy

Zero provider requests for lifecycle transitions. No CV / notes / status / next-action leave the existing privacy boundary to Jobgether, TheirStack, or Remote OK.

## Deferred

- persisted nextAction / nextActionAt workflow
- server lifecycle event history
- automatic read-time mutation repair (detect/report only if added later)
- reminders / cron / calendar
- server-side lifecycle event history
- Phase 9 analytics expansions
- V1 enum expansion for lossless `final` vs `screening`
