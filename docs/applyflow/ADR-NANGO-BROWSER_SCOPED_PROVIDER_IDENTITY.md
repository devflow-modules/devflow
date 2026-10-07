# ADR â€” Account-Owned Identity for Nango Provider Runtime

**Status:** Accepted
**Date:** 2026-10-05
**Supersedes:** browser-scoped decision of 2026-09-28 (AF-NANGO-001)
**Related:** [PROVIDER-RUNTIME-ENV-SECRETS-BOUNDARY.md](../career-suite/integrations/PROVIDER-RUNTIME-ENV-SECRETS-BOUNDARY.md)

## Decision

Nango Gmail/Calendar connections for personal routes belong to the authenticated `ApplyFlowAccount`.

```
Supabase session â†’ requireApplyFlowAccount() â†’ accountId
  â†’ end_user_id = applyflow-acct-{provider}-{sha256("applyflow-nango-account:"+accountId+":"+provider)[0:32]}
```

Client `accountId`, `end_user_id`, `connectionId`, and the `af_nango_caller` cookie are not authorization authority. Origin/CSRF checks remain. The browser cookie is ignored for ownership and is not migrated onto the account.

| Event | Behavior |
| --- | --- |
| Logout | Ends the ApplyFlow session and revokes extension grants. Does **not** disconnect Nango or revoke Google OAuth. |
| Disconnect | Deletes the Nango connection for this account's derived `end_user_id`. Does not sign out. Does not revoke the Google Account grant. |
| Google revoke | Separate, in Google Account settings. |
| Old browser connection | Left in place. Not adopted. The user reconnects explicitly. |
| Other account, same browser | Different derived `end_user_id`. |

Scopes are unchanged. Background sync is not enabled.

## Historical decision (2026-09-28)

The pilot previously used `af_nango_caller` as browser-scoped identity. That contract is no longer the personal-route authority. The cookie helpers remain for tests of the old HMAC format and are not consulted by connect, status, read, or disconnect.

## Archive â€” 2026-09-28 browser-scoped pilot

The sections below describe the superseded pilot. They are not the current contract.

## Context

ApplyFlow currently has **two independent identity planes**:

| Plane | Authority | Used for |
| --- | --- | --- |
| **A. Persistence** | Supabase session â†’ `ApplyFlowAccount` | `/api/applyflow/v2/*` |
| **B. Provider runtime** | `af_nango_caller` browser cookie â†’ server-derived `end_user_id` | `/provider-runtime/nango/*` |

Audit AF-NANGO-001 asked whether Nango Gmail/Calendar ownership is **browser-scoped** or **account-scoped**. Cross-caller isolation already holds; the product question is what ownership the pilot **intends**.

## Archived decision

**OPTION_A â€” Browser-scoped provider runtime identity.** Superseded on 2026-10-05.

Nango provider connections in the **current pilot/runtime** belong to the **browser caller identity**, **not** to `ApplyFlowAccount`.

This is **ACCEPTED_BY_DESIGN** for the pilot. It is **not** a durable SaaS account-bound Gmail integration.

## Authority

```
af_nango_caller (HttpOnly, SameSite=Lax, path=/provider-runtime/nango)
  â†’ server HMAC validation
  â†’ callerNonce
  â†’ end_user_id = applyflow-{provider}-{sha256("applyflow-nango-caller:"+nonce)[0:32]}
```

**Client-controlled values must never become authorization authority:**

- `accountId` / ApplyFlow account id
- `end_user_id` / `endUserId`
- `connectionId`
- `callerNonce` (body/query)

Server derives ownership from the validated cookie only. Body overrides are ignored.

## Product semantics

| Event | Expected behavior |
| --- | --- |
| Same browser caller across ApplyFlow logout | Provider identity **retained** |
| Switch ApplyFlow accounts in same browser | Provider identity **does not rotate** |
| Different browser / device / profile | **Different** provider identity |
| Clearing / losing / expiring caller cookie | Access to old identity **lost**; old Nango connections may be orphaned |
| ApplyFlow logout | **Does not** disconnect provider; **does not** revoke Google OAuth |
| Explicit Disconnect | Removes Nango connection for **this** browser caller |
| Multi-device | **No** guarantee that Laptop connection appears on Desktop |

Logout â‰  disconnect â‰  Google OAuth revoke.

## Non-goals

- Durable account-owned Gmail/Calendar integration
- Multi-device connection continuity
- Provider identity migration from browser â†’ account
- Exactly-once provider operations
- Automatic recovery of orphaned caller identities
- Background Gmail/Calendar synchronization

## Future direction

If provider integration becomes durable SaaS functionality, **account-scoped** identity may be reconsidered as a **new** contract (authenticated `ApplyFlowAccount`, dedicated derivation secret, CSRF retained). That design is **not implemented** and must not be described as current behavior.

## Consequences

### Positive

- Matches implemented routes, tests, and sandbox documentation
- Works without Supabase on Nango routes
- Clear isolation between Persistence V2 and provider pilot
- Short, testable caller-vs-caller security model

### Negative

- Account switch in the same browser may keep the previous provider connection visible
- Cookie loss orphans Nango-side connections until reconnect / Google revoke
- UX must explicitly say browser/device scope to avoid false account expectations

## Secret coupling (future hardening, out of scope)

Caller cookie HMAC currently uses `NANGO_SECRET_KEY`. A **dedicated** cookie-signing / identity secret may be considered later. **Not** changed in AF-NANGO-001.

## AF-REL-003

Orthogonal. Offering GET visibility of Persistence V2 staging rows is unrelated to Nango caller ownership.

## References

- `apps/applyflow/src/lib/provider-runtime/nango-caller-session.ts`
- `apps/applyflow/src/lib/provider-runtime/nango-server-provider.ts`
- Isolation tests: `nango-caller-isolation.test.ts`, connect/status/disconnect route tests
