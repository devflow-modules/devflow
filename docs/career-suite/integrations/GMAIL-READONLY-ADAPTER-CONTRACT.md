# Gmail Read-Only Adapter Contract

Career Suite defines a privacy-first Gmail read-only adapter contract for future derived career signals.

The contract does not call Gmail, import messages, retain bodies or snippets, expose provider tokens, or update applications automatically.

## Status

| Item | State |
|------|--------|
| Contract types and safety policy | **Defined** in `@devflow/career-sync` `gmail-readonly-adapter` |
| Sandbox adapter (`GmailReadOnlyAdapter`) | **Implemented** — see [GMAIL-READONLY-SANDBOX-ADAPTER.md](./GMAIL-READONLY-SANDBOX-ADAPTER.md) |
| Gmail API runtime | **Not implemented** |
| Nango proxy for Gmail | **Not implemented** |
| ApplyFlow UI changes | **Out of scope** |
| CareerBundle enrichment from live Gmail | **Not implemented** |

This document is **contract-only** for the formal boundary. The deterministic sandbox implementation lives in [GMAIL-READONLY-SANDBOX-ADAPTER.md](./GMAIL-READONLY-SANDBOX-ADAPTER.md). No OAuth, Nango SDK, `googleapis`, sync jobs, or live message fetch exists in the sandbox adapter.

## Objective

Define pure, client/runtime-safe contracts for a future Gmail read-only adapter:

- minimal request
- ephemeral normalized metadata input
- derived-signal-only output
- blocked/ready/completed/error results
- explicit safety policy
- data boundaries
- adapter interface

## Relationship to existing contracts

| Module | Role |
|--------|------|
| `provider-adapter` | Generic provider adapter boundary (`ProviderAdapter`, `ProviderNormalizedMessage`) |
| `gmail-sync` | Fixture/sandbox sync preview (`buildGmailSyncPreview`, `CareerSyncSignal`) |
| `gmail-readonly-adapter` | **Future** live read-only adapter contract with verified-connection gate |
| `provider-connection/runtime-verification` | Server-side connection verification prerequisite for `nango` runtime |

The new contract complements — does not replace — `CareerSyncSignal`, `CareerBundleUnifiedSyncEnrichment`, or the Nango sandbox adapter.

## Principles

The future Gmail adapter must be:

- read-only
- minimal-scope
- derived-signals-only
- no raw retention
- user-review-required
- connection-verification-required (for real `nango` runtime)
- feature-gated in future runtime PRs

## Preconditions

For real `nango` runtime (future):

1. Explicit user consent
2. Provider runtime feature flags enabled
3. **Server-verified connection** (`connectionVerified: true`)
4. Safe message window (`maxMessages` ≤ 50)

Requests with `connectionVerified: false` are **blocked** at the contract layer.

## Request contract

`GmailReadOnlyAdapterRequest`:

- `provider: "gmail"`
- `runtime: "nango" | "sandbox"`
- `connectionVerified: boolean`
- `requestedAt: string`
- `window?: { from?, to?, maxMessages }`
- `userReviewRequired: true` (invariant)

The request must not contain tokens, Nango secrets, or provider credentials.

## Ephemeral metadata input

`GmailEphemeralMessageMetadata` allows only minimal metadata for future classification:

- `occurredAt`, `direction`, `senderDomain`, `recipientDomains`
- `hasAttachment`, `threadMessageCount`, `labels`

**Not included:** raw subject, snippet, body, message/thread IDs, full email addresses, attachments, headers, or provider payload.

Ephemeral metadata is an internal input boundary for future adapters — never serialized into results or CareerBundle.

## Derived signal output

`GmailDerivedSignal` kinds:

- `application_detected`
- `interview_likely`
- `follow_up_required`
- `recruiter_response_detected`
- `rejection_likely`
- `offer_likely`

Each signal is:

- derived and reviewable (`reviewRequired: true`)
- non-authoritative (`confidence` 0–1)
- free of subject/snippet/body/raw IDs

## Result contract

`GmailReadOnlyAdapterResult` invariant flags:

```txt
safeForClient: true
readOnly: true
importedRawMessages: false
retainedRawPayload: false
retainedBodies: false
retainedSnippets: false
retainedAttachments: false
hasToken: false
userReviewRequired: true
```

Statuses: `blocked` | `ready` | `completed` | `error`

## Safety policy

`GmailReadOnlySafetyPolicy` explicitly prohibits:

- raw bodies and snippets
- attachments
- raw provider payload
- token exposure
- meeting links

And requires:

- verified connection (policy level)
- user review

Helpers: `createGmailReadOnlySafetyPolicy()`, `isGmailReadOnlySafetyPolicySafe()`, `assertGmailReadOnlySafetyPolicy()`.

## Adapter interface

```ts
export type GmailReadOnlyAdapter = {
  execute(request: GmailReadOnlyAdapterRequest): Promise<GmailReadOnlyAdapterResult>;
};

export type GmailReadOnlyMetadataProvider = {
  listMessageMetadata(input: {
    from?: string;
    to?: string;
    limit: number;
  }): Promise<GmailEphemeralMessageMetadata[]>;
};
```

No implementation ships in this contract PR.

## Block reasons

| Reason | Trigger |
|--------|---------|
| `connection_not_verified` | `connectionVerified !== true` |
| `unsafe_message_limit` | `maxMessages` outside 1–50 |
| `invalid_time_window` | invalid ISO dates or `from > to` |
| `runtime_not_supported` | runtime outside `nango` \| `sandbox` |

## Forbidden data

The contract must not allow retention or output of:

- raw email body, HTML body, full plain-text body
- raw snippet
- attachments and attachment URLs/content
- full message headers
- raw provider payload
- OAuth access/refresh tokens, Nango credentials
- meeting links
- provider account payload
- raw message/thread IDs in derived signals

## Public exports

From `@devflow/career-sync`:

- Types: `GmailReadOnlyAdapterRequest`, `GmailReadOnlyAdapterResult`, `GmailDerivedSignal`, `GmailReadOnlySafetyPolicy`, …
- Helpers: `createGmailReadOnlyAdapterRequest`, `evaluateGmailReadOnlyAdapterRequest`, `createGmailReadOnlyAdapterResult`, `createBlockedGmailReadOnlyAdapterResult`, `isGmailReadOnlyAdapterResultSafe`

## What this PR does not claim

Do **not** state:

- Gmail integration completed
- Gmail sync active
- messages imported
- recruiter emails detected in production

## Related docs

- [Sync Data Boundaries](./SYNC-DATA-BOUNDARIES.md)
- [Nango Gmail/Calendar Plan](./NANGO-GMAIL-CALENDAR-PLAN.md)
- [Provider Consent Architecture](./PROVIDER-CONSENT-ARCHITECTURE.md)
- [Real Provider Runtime Readiness Checklist](./REAL-PROVIDER-RUNTIME-READINESS-CHECKLIST.md)
