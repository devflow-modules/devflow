# ADR — Browser-Scoped Identity for Nango Pilot Provider Runtime

**Status:** Accepted  
**Date:** 2026-09-28  
**Finding:** AF-NANGO-001  
**Related:** [PROVIDER-RUNTIME-ENV-SECRETS-BOUNDARY.md](../career-suite/integrations/PROVIDER-RUNTIME-ENV-SECRETS-BOUNDARY.md), [NANGO-SANDBOX-RUNTIME-VALIDATION-RUNBOOK.md](../career-suite/integrations/NANGO-SANDBOX-RUNTIME-VALIDATION-RUNBOOK.md)

## Context

ApplyFlow currently has **two independent identity planes**:

| Plane | Authority | Used for |
| --- | --- | --- |
| **A. Persistence** | Supabase session → `ApplyFlowAccount` | `/api/applyflow/v2/*` |
| **B. Provider runtime** | `af_nango_caller` browser cookie → server-derived `end_user_id` | `/provider-runtime/nango/*` |

Audit AF-NANGO-001 asked whether Nango Gmail/Calendar ownership is **browser-scoped** or **account-scoped**. Cross-caller isolation already holds; the product question is what ownership the pilot **intends**.

## Decision

**OPTION_A — Browser-scoped provider runtime identity.**

Nango provider connections in the **current pilot/runtime** belong to the **browser caller identity**, **not** to `ApplyFlowAccount`.

This is **ACCEPTED_BY_DESIGN** for the pilot. It is **not** a durable SaaS account-bound Gmail integration.

## Authority

```
af_nango_caller (HttpOnly, SameSite=Lax, path=/provider-runtime/nango)
  → server HMAC validation
  → callerNonce
  → end_user_id = applyflow-{provider}-{sha256("applyflow-nango-caller:"+nonce)[0:32]}
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

Logout ≠ disconnect ≠ Google OAuth revoke.

## Non-goals

- Durable account-owned Gmail/Calendar integration  
- Multi-device connection continuity  
- Provider identity migration from browser → account  
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
