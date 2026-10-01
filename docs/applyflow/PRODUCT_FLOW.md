# ApplyFlow — product flow

Canonical user/domain workflow for the current product.

Related: [`ARCHITECTURE.md`](./ARCHITECTURE.md) · [`JOB_DISCOVERY.md`](./JOB_DISCOVERY.md) · [`APPLICATION_LIFECYCLE.md`](./APPLICATION_LIFECYCLE.md)

---

## End-to-end flow

```text
Discovery
  → Match Preview
  → Explicit Save
  → Opportunity Queue
  → Application Readiness
  → Register Application
  → Mark Sent
  → Application Lifecycle
  → Derived Next Action
```

---

## Domain objects

| Object | Role |
|--------|------|
| **Candidate / resume context** | Profile + resume variants in the browser (`ResumeLibrary`). Used for local match and readiness. Not sent to discovery providers. |
| **ApplyFlowJob** | Saved opportunity: title, company, URL, `jobMatch`, status (`reviewing` / `ignored` / applied-side statuses after sync). |
| **ApplyFlowApplication** | Candidacy record linked by `sourceJobId` when present. Lifecycle status is user-owned intent. |

**Job ≠ Application.** Saving a job never creates an application. Registering an application never submits to an employer ATS.

---

## Step semantics

### 1. Discovery

User picks **one** provider and searches explicitly.

- Request: filters only (no CV/resume/profile body)
- Response: search hits (not yet Jobs)

### 2. Match Preview

Browser-only evaluation via the shared Match Engine.

- **Does not persist**
- **Does not** create Job or Application
- **Does not** spend extra TheirStack credits beyond the search that returned the hit
- Requires a usable job description

### 3. Explicit Save

User chooses **Guardar** / save-and-analyze.

- Creates or dedupes an **ApplyFlowJob**
- Initial status is **`reviewing`** (even if match decision was `skip`)
- Match recommendation stays on `jobMatch` — it is **not** the queue membership rule

### 4. Opportunity Queue

Derived view — **no Shortlist entity**.

- Active queue = jobs with `status === "reviewing"`
- Ignore → `ignored` (retained)
- Restore → back to `reviewing`
- Applied / later statuses leave the active queue naturally
- No priority field today

### 5. Application Readiness

Derived checklist before registering.

- Sources: `jobMatch`, resume selection, gaps, source URL, existing application state
- **No** readiness score entity, **no** Preparation model
- Guidance, **not** a hard gate — user may proceed despite gaps

### 6. Register Application

Creates an **Application** (local or V2 cloud).

- Does **not** call LinkedIn / ATS submit APIs
- Does **not** auto-mark as sent

### 7. Mark Sent

User asserts the external submission already happened.

- Application moves to applied/post-apply semantics
- Linked Job status syncs when `sourceJobId` is present

### 8. Application Lifecycle

Canonical pipeline transitions (see [`APPLICATION_LIFECYCLE.md`](./APPLICATION_LIFECYCLE.md)).

- Local mode may record career events
- V2 cloud: **current state** is authoritative; **server event timeline is not implemented**

### 9. Derived Next Action

`deriveApplicationNextAction(...)` is pure UI guidance:

- not persisted
- not a task / reminder / calendar event
- never auto-transitions or sends messages

---

## Critical distinctions

| Phrase | Meaning |
|--------|---------|
| Match recommendation | Advisory fit |
| User status / ignore / apply | Intent |
| Register | Create Application record |
| Mark Sent / submit | External send already happened |
| Preview | Ephemeral |
| Save | Persist Job |

---

## Companion: Chrome extension

The extension assists LinkedIn Easy Apply field-by-field with **no auto-submit**. History can be exported as JSON into the dashboard. That path complements discovery; it does not replace the Job/Application cloud model.
