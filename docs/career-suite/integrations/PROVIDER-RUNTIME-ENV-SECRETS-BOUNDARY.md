# Provider Runtime Environment and Secrets Boundary

This document defines the environment and secrets boundary required before Career Suite introduces real OAuth, Nango runtime, Gmail connector, Calendar connector, provider token handling, or provider sync jobs.

---

## Current status

**Implemented:**

- provider runtime feature flag plan
- feature flag evaluation helpers
- disabled provider runtime shell
- provider connection action mock
- provider runtime app boundary contract
- real provider runtime readiness checklist

**Not implemented:**

- real OAuth
- Nango SDK runtime
- Gmail API connector
- Calendar API connector
- provider token storage
- provider sync jobs
- persisted provider connection state

---

## Runtime flags

The following flags are required and must default to disabled:

| Variable | Default | Client exposure |
| --- | --- | --- |
| `CAREER_PROVIDER_RUNTIME_ENABLED` | `false` | Server/runtime only |
| `NANGO_RUNTIME_ENABLED` | `false` | Server/runtime only |
| `GMAIL_PROVIDER_ENABLED` | `false` | Server/runtime only |
| `CALENDAR_PROVIDER_ENABLED` | `false` | Server/runtime only |

Missing flags must behave as disabled.

Provider-specific flags must never bypass the global provider runtime flag.

See [`PROVIDER-RUNTIME-FEATURE-FLAGS.md`](./PROVIDER-RUNTIME-FEATURE-FLAGS.md).

---

## Future secrets

Future runtime work may require provider/runtime secrets such as:

| Secret | Purpose | Client exposure |
| --- | --- | --- |
| `NANGO_SECRET_KEY` | Server-side Nango runtime access | Never |
| `NANGO_WEBHOOK_SECRET` | Webhook verification, if webhooks are introduced | Never |
| `GOOGLE_CLIENT_ID` | OAuth client identifier | Server/runtime boundary only unless explicitly reviewed |
| `GOOGLE_CLIENT_SECRET` | OAuth secret | Never |
| `GOOGLE_REDIRECT_URI` | OAuth callback URL | Server/runtime boundary only |

These are placeholders for future runtime planning. This PR must not add them to code or `.env` files.

---

## Forbidden client exposure

The following must never be exposed to client components, browser storage, app exports, CareerBundle, or Interview Lab imports:

- Nango secret keys
- Google client secrets
- OAuth access tokens
- OAuth refresh tokens
- provider account IDs
- provider payloads
- raw email bodies
- raw calendar descriptions
- meeting links
- webhook secrets

---

## Environment file policy

Do not commit:

- `.env`
- `.env.local`
- `.env.production`
- `.env.preview`
- secrets in markdown examples with real values
- copied provider dashboard credentials
- OAuth callback secrets

Allowed docs examples must use placeholder values only:

```txt
NANGO_SECRET_KEY=<server-only-secret>
GOOGLE_CLIENT_SECRET=<server-only-secret>
```

---

## Runtime boundary policy

Future provider runtime secrets must only be read by an approved server/runtime boundary.

They must not be read by:

- client components
- shared UI packages
- CareerBundle serializers
- Interview Lab import flows
- ApplyFlow export flows
- browser extension code
- tests using real values

---

## Logging policy

Logs must never include:

- tokens
- refresh tokens
- provider raw payloads
- OAuth callback query secrets
- authorization codes
- raw email/calendar content
- meeting links
- headers
- attachments

---

## CI and deployment policy

Before real runtime is enabled:

- CI must run with runtime flags disabled by default
- preview deployments must keep runtime flags disabled unless explicitly approved
- production must keep runtime flags disabled until the first runtime PR is validated
- sandbox/mock/demo flows must pass with all runtime flags disabled

---

## First OAuth PR requirements

The first real OAuth PR must:

- keep runtime disabled by default
- require explicit flags
- require explicit user consent
- keep secrets server-side
- avoid token exposure to client
- avoid token fields in CareerBundle
- avoid raw provider payload persistence
- include blocked-path tests
- include no-secret-leak tests
- preserve sandbox/mock/demo behavior with flags disabled

See [`REAL-PROVIDER-RUNTIME-READINESS-CHECKLIST.md`](./REAL-PROVIDER-RUNTIME-READINESS-CHECKLIST.md).

---

## Correct implementation claim

**Correct:**

Career Suite defines environment and secrets boundaries for future provider runtime.

**Avoid:**

- Nango secrets are configured
- Google OAuth is active
- Gmail is connected
- Calendar is connected
- provider tokens are stored

---

## Related

- [Integrations overview](./README.md)
- [Provider Runtime Feature Flags](./PROVIDER-RUNTIME-FEATURE-FLAGS.md)
- [Real Provider Runtime Readiness Checklist](./REAL-PROVIDER-RUNTIME-READINESS-CHECKLIST.md)
- [Provider Consent Integration Architecture](./PROVIDER-CONSENT-ARCHITECTURE.md)
- [Nango Gmail/Calendar Plan](./NANGO-GMAIL-CALENDAR-PLAN.md)
- [Sync Data Boundaries](./SYNC-DATA-BOUNDARIES.md)
