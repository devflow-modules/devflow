# ApplyFlow — privacy & security (engineering)

Engineering data-flow model. **Not** a legal Privacy Policy. **No** GDPR/LGPD compliance claim.

Related: [`ARCHITECTURE.md`](./ARCHITECTURE.md) · [`JOB_DISCOVERY.md`](./JOB_DISCOVERY.md) · [`PRODUCTION_READINESS.md`](./PRODUCTION_READINESS.md)

---

## Principles

1. CV / resume / profile stay in the browser for discovery and matching.
2. Discovery providers never receive CV/profile bodies.
3. Provider API keys never reach the browser (`THEIRSTACK_API_KEY` server-only).
4. No auto-application and no auto-submit to employer ATS.
5. Application notes/status are not sent to job providers.
6. Tenant data is scoped by server-derived account (V2).

---

## Data matrix

| Data | Browser | ApplyFlow server | DB (V2) | Job providers |
|------|---------|------------------|---------|---------------|
| CV / resume text | Yes | No (not on discovery path) | No | **No** |
| Candidate profile / skills | Yes | No (discovery) | No | **No** |
| Search filters (keyword, location, …) | Yes | Yes (search API) | No | Yes (as query) |
| Job description (hit / saved) | Yes | Yes (search/normalize; save via V2) | Yes (Job) | Source of truth upstream |
| Job match score / decision | Yes (computed locally) | No scoring of CV on search | Optional on Job | **No** |
| Application record | Yes (local) / yes (V2 client) | Yes (V2 API) | Yes | **No** |
| Application notes | Yes / V2 | Yes (V2) | Yes | **No** |
| Provider API keys | No | Yes (env) | No | Auth to provider |
| Auth session | Cookies | Validates session | Account row | No |

---

## Discovery request boundary

`POST /api/applyflow/job-sources/search` accepts provider + filters. E2E asserts bodies do **not** include `cv`, `resume`, or `profile`.

Match Preview runs in the browser after hits return.

---

## Closed-beta hardening (factual)

| Control | Evidence |
|---------|----------|
| Tenant-scoped Job/Application access | Repository `accountId` + V2 E2E isolation |
| Cross-tenant mutation blocked | V2 E2E |
| Origin allowlist on mutating routes | Search + V2 POST/PATCH |
| Security headers baseline | `next.config.ts` |
| TheirStack OFF on shared deploy | Hosted default deny / `APPLYFLOW_THEIRSTACK_ENABLED` |
| E2E cannot target production hosts | Playwright base URL guard |
| Error redaction | `error-tracking` sanitization tests |
| Pilot eligibility server-authoritative | `pilotEligible` + HTTP capability matrix |

Prefer these statements over “enterprise-grade security.”

---

## Explicit non-claims

- Not a GDPR/LGPD compliance statement
- Not end-to-end encryption of localStorage
- Not a guarantee against XSS/CSRF beyond documented controls
- Broad CSRF tokens and strict CSP are deferred to public beta
- Self-service account deletion is deferred (operator process only)
