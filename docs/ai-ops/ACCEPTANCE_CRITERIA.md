# Acceptance Criteria

Standard model for evaluating whether work is ready to merge. Apply the sections relevant to the change type; all changes must satisfy **cross-cutting** items unless explicitly waived with owner approval.

---

## Cross-Cutting (Default for All Changes)

| Criterion | Pass when |
|-----------|-----------|
| **Functional fit** | Implemented behavior matches stated requirements and non-goals are respected. |
| **Error handling** | Failure modes are defined; users see safe messages; operators get actionable logs without secrets. |
| **Logging** | Significant actions and failures are observable; log volume is appropriate (no noisy loops). |
| **Performance** | No obvious N+1, unbounded queries, or synchronous hot-path blocking without justification. |
| **Edge cases** | Documented or handled: null, empty, idempotency, concurrency where relevant. |
| **Testability** | Critical logic is testable; tests exist where risk warrants (see DEFINITION_OF_DONE). |

---

## Functional Requirements

- Requirements are **testable statements** (given / when / then), not adjectives.
- Acceptance must reference **observable outcomes**: API status, DB state, UI state, job completion.
- **Idempotency** required for webhooks, payment callbacks, and retries.

---

## Error Handling

| Layer | Expectation |
|-------|-------------|
| **User-facing** | Consistent error shape; no stack traces to clients in production. |
| **Server** | Distinction between client error (4xx) and server fault (5xx); correlation id where platform supports it. |
| **External APIs** | Timeouts, retries with backoff where appropriate; circuit-breaking discussed for critical deps. |

---

## Logging

- **Structured** where the codebase already uses it; otherwise consistent key-value or message patterns.
- **Never:** passwords, tokens, full auth headers, full card numbers, health record identifiers in plain logs.
- **Include when useful:** `tenantId`, `userId` (non-PII ids), operation name, duration, outcome.

---

## Performance Considerations

- Database: indexes for new query patterns; explain plans for heavy paths when adding filters.
- API: pagination for list endpoints; payload size awareness.
- Frontend: avoid unnecessary re-renders; code-split large routes when introducing heavy deps.
- Jobs: batch size limits; backoff on rate-limited externals.

---

## Edge Cases

Checklist (apply as relevant):

- [ ] Empty collection / zero results
- [ ] Invalid input (schema validation)
- [ ] Expired session / token
- [ ] Permission denied / wrong role / tenant mismatch
- [ ] Duplicate request (idempotency keys)
- [ ] Partial failure in batch operations
- [ ] Clock skew / timezone (billing, scheduling)

---

## Domain Examples

### API (REST / Route Handlers)

| # | Criterion | Example |
|---|-----------|---------|
| 1 | Authn | `401` without valid session or API key per product rules. |
| 2 | Authz | User cannot access another tenant’s resources; returns `403` or empty per privacy policy. |
| 3 | Validation | Request body validated with Zod; `400` with field errors. |
| 4 | Success shape | Response matches existing `{ data }` / `sendSuccess` conventions. |
| 5 | Errors | `404` when resource missing; `409` on conflict when applicable. |

### RPA (Playwright / Automation)

| # | Criterion | Example |
|---|-----------|---------|
| 1 | Selectors | Prefer stable selectors; document fragility if only text-based. |
| 2 | Waits | Explicit waits for navigation/network; no fixed long sleeps except justified. |
| 3 | Retries | Login and flaky steps use controlled retry with logging. |
| 4 | Data | No hardcoded PHI; credentials from secure config. |
| 5 | Failure artifacts | Screenshots or traces on failure where pipeline supports. |

### Frontend (React / Next.js)

| # | Criterion | Example |
|---|-----------|---------|
| 1 | Loading | Loading and error states for async data; no infinite spinners without timeout UX. |
| 2 | Forms | Client validation aligned with server; accessible labels. |
| 3 | Routing | Protected routes align with middleware / auth checks. |
| 4 | SEO | Public pages have metadata; app shells use `noindex` where appropriate. |
| 5 | A11y | Critical actions keyboard-accessible; focus management on modals. |

---

## Testability

- **Unit:** Pure logic, validators, mappers.
- **Integration:** API + DB or API + mocked external with contract assertions.
- **E2E:** Critical user journeys post-release for high-risk UI.

Risk-based minimum:

| Risk | Minimum test bar |
|------|-------------------|
| Low | Lint + build + manual spot check |
| Medium | + unit or integration for changed logic |
| High | + integration and/or E2E + explicit edge-case list executed |

---

*Product owners may attach additional acceptance criteria per ticket; they supersede examples only where documented.*
