# Provider Runtime Feature Flags

Career Suite must keep all real provider runtimes disabled by default.

This document defines the feature flag plan required before any real OAuth, Nango runtime, Gmail connector, or Calendar connector is introduced.

**Status:** Flag plan documented; evaluation helpers and disabled runtime shell implemented in `@devflow/career-sync`. No runtime activation in apps yet.

---

## Current status

**Implemented today:**

- Provider consent architecture docs
- Provider adapter interface contracts
- Nango sandbox adapter with fake payloads
- Provider connection status model
- ApplyFlow consent mock panel
- ApplyFlow mock panel wired to fake/sandbox connection snapshots
- Provider runtime feature flag evaluation helpers (`provider-runtime-flags` module)
- Disabled provider runtime shell (`provider-runtime` module)

**Not implemented today:**

- Real OAuth
- Nango SDK runtime
- Gmail API connector
- Calendar API connector
- Provider token storage
- Provider sync jobs
- Background sync
- Persisted provider connection state
- Runtime flag wiring in apps

---

## Evaluation helpers

`@devflow/career-sync` includes pure feature flag evaluation helpers.

The helpers receive an explicit flag map and do not read `process.env` directly.

They do not activate runtime behavior. They only evaluate whether a future runtime would be allowed to proceed.

Public exports: `readProviderRuntimeFlag`, `evaluateProviderRuntimeFlags`, `canUseProviderRuntime`, `canUseNangoRuntime`, `canUseGmailProvider`, `canUseCalendarProvider`.

---

## Disabled provider runtime shell

`@devflow/career-sync` includes a disabled provider runtime shell.

The shell evaluates runtime gates and consent state, but it never starts OAuth, calls Nango, calls Gmail or Calendar APIs, stores tokens, persists provider data, or runs sync jobs.

Even when all gates evaluate to allowed, the current shell returns a disabled runtime result until a future runtime PR explicitly implements behavior behind feature flags and consent.

Public exports: `evaluateProviderRuntimeGate`, `createDisabledProviderRuntimeResult`, `createDisabledProviderRuntimeShell`.

---

## Required flags

| Flag | Default | Purpose |
| --- | --- | --- |
| `CAREER_PROVIDER_RUNTIME_ENABLED` | `false` | Global kill switch for all real provider runtime behavior |
| `NANGO_RUNTIME_ENABLED` | `false` | Enables real Nango runtime wiring only when global provider runtime is also enabled |
| `GMAIL_PROVIDER_ENABLED` | `false` | Enables Gmail provider connector only when global + runtime gates allow it |
| `CALENDAR_PROVIDER_ENABLED` | `false` | Enables Calendar provider connector only when global + runtime gates allow it |

---

## Gate hierarchy

Real provider behavior must require all relevant gates.

```txt
CAREER_PROVIDER_RUNTIME_ENABLED=true
  → NANGO_RUNTIME_ENABLED=true
    → GMAIL_PROVIDER_ENABLED=true
    → CALENDAR_PROVIDER_ENABLED=true
```

A provider-specific flag must **never** bypass the global runtime flag.

### Blocking rules

1. Real provider runtime is **prohibited** if `CAREER_PROVIDER_RUNTIME_ENABLED !== true`.
2. Real Nango runtime is **prohibited** if `NANGO_RUNTIME_ENABLED !== true`.
3. Real Gmail connector is **prohibited** if `GMAIL_PROVIDER_ENABLED !== true`.
4. Real Calendar connector is **prohibited** if `CALENDAR_PROVIDER_ENABLED !== true`.
5. No OAuth may start without explicit user consent — even when all flags are enabled.
6. No provider call may occur without the required flags **and** user consent.
7. No token may reach the client.
8. No token may enter CareerBundle.
9. No token may enter `localStorage`.
10. No raw provider payload may be persisted.
11. No raw email body may be saved.
12. No raw calendar description may be saved.
13. No meeting link may be saved.
14. No automatic sync may occur without opt-in.
15. No persistence of derived signals may occur without explicit opt-in.
16. Real runtime must ship behind feature flags and a separate environment from sandbox/demo defaults.
17. Sandbox, mock, and demo flows must continue to work when all flags are `false`.

---

## Default-off policy

All flags must default to `false`.

A missing flag must be treated as `false`.

Local development, preview deployments, and production must not activate real provider behavior unless flags are explicitly enabled in that environment.

Feature flags are **not** consent. Flags only allow runtime code paths to exist; user consent is still required before OAuth or sync.

---

## Consent requirements

Even when flags are enabled, runtime behavior still requires:

- Explicit user consent
- Visible provider scopes before connect
- User review before enrichment is used
- Revoke / disconnect support
- Delete derived data support
- No hidden sync
- No background sync without opt-in

See [Provider Consent Integration Architecture](./PROVIDER-CONSENT-ARCHITECTURE.md).

---

## Runtime restrictions

When any required flag is disabled, the system must **not**:

- Start OAuth
- Call Nango runtime
- Call Gmail APIs
- Call Calendar APIs
- Request provider tokens
- Store provider tokens
- Sync provider data
- Persist provider connection state
- Persist derived provider signals
- Run background sync jobs

---

## Token boundaries

Tokens must never be exposed to:

- Client components
- Browser `localStorage`
- CareerBundle
- Sync enrichment payloads
- Interview Lab imports
- ApplyFlow exports
- Logs
- Fixtures
- Demo JSON

Future token handling must happen only through an approved provider vault / runtime boundary (e.g. Nango vault on the server side — not in this plan’s implementation scope).

---

## Data boundaries

Real provider runtime must never persist:

- Raw email body
- Full email snippets
- Raw calendar descriptions
- Meeting links
- Attendee emails
- Attachments
- Headers
- Provider IDs
- Provider payloads
- OAuth tokens
- Refresh tokens

Only derived, redacted signals may leave the adapter layer.

See [Sync Data Boundaries](./SYNC-DATA-BOUNDARIES.md).

---

## Sandbox compatibility

The following must continue to work with **all** runtime flags disabled:

- Nango sandbox adapter (`@devflow/career-sync`)
- Provider adapter contract tests
- Provider connection model tests
- ApplyFlow consent mock panel
- ApplyFlow demo sync enrichment opt-in
- Interview Lab sync enrichment preview
- CareerBundle demo fixtures

---

## Required tests before runtime PRs

Before any runtime PR is allowed, tests must prove:

- Missing flags behave as disabled
- `false` flags block runtime
- Provider-specific flags cannot bypass the global flag
- OAuth cannot start without consent
- Provider calls cannot run without all gates
- Tokens cannot reach client code
- Raw payloads cannot reach CareerBundle
- Sandbox behavior remains available with runtime disabled

---

## First allowed runtime PR shape

The first runtime PR must be behind feature flags and should only add a **disabled runtime shell**.

It must not ship enabled provider behavior by default.

### Recommended sequence

| Step | PR | Scope |
|------|-----|--------|
| 1 | `docs: add provider runtime feature flag plan` | **This document** |
| 2 | `feat: add provider runtime feature flag helpers` | Evaluation helpers — default off |
| 3 | `feat: add disabled provider runtime shell` | Shell + tests — no live OAuth |
| 4 | `feat: add consent-gated provider connection action mock` | UI action wiring — still no real OAuth |
| 5 | `feat: add real Nango OAuth behind explicit flags and consent` | Live OAuth only after gates pass |

---

## Claims to avoid

Do **not** claim:

- Gmail is connected
- Calendar is connected
- Nango is running
- OAuth is active
- Provider sync is live
- Emails or calendar events are imported automatically

**Current correct claim:**

Career Suite has sandboxed provider adapter contracts, mock consent UI, connection status models, and a feature flag plan for future consent-based provider runtime.

---

## Related

- [Integrations overview](./README.md)
- [Provider Consent Integration Architecture](./PROVIDER-CONSENT-ARCHITECTURE.md)
- [Nango Gmail/Calendar Plan](./NANGO-GMAIL-CALENDAR-PLAN.md)
- [Sync Data Boundaries](./SYNC-DATA-BOUNDARIES.md)
- [E2E sync enrichment checklist](../demo/E2E-SYNC-ENRICHMENT-CHECKLIST.md)
