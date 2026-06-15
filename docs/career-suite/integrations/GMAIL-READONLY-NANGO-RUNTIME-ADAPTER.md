# Gmail Read-Only Nango Runtime Adapter

Career Suite includes a server-only Gmail read-only runtime adapter through Nango.

The adapter processes limited Gmail metadata without retaining message bodies, snippets, attachments, provider identifiers or OAuth credentials. Derived signals remain review-required, and this runtime is not connected to automatic CareerBundle enrichment.

## Status

| Item | State |
|------|--------|
| Gmail read-only adapter contract | **Defined** in `@devflow/career-sync` |
| Gmail sandbox adapter | **Implemented** |
| Gmail Nango runtime adapter | **Implemented** — ApplyFlow server-only |
| Provider-derived runtime preview | **Implemented** — via composition route; see [PROVIDER-DERIVED-RUNTIME-PREVIEW.md](./PROVIDER-DERIVED-RUNTIME-PREVIEW.md) |
| CareerBundle auto-enrichment from runtime | **Not implemented** |
| Background sync | **Not implemented** |

## Official API validation

| Source | Finding |
|--------|---------|
| [Nango Gmail integration](https://nango.dev/docs/api-integrations/google-mail) | Integration ID `google-mail`; proxy via `nango.get()` |
| [Nango proxy guide](https://nango.dev/docs/guides/platform/proxy/implement-requests-proxy) | Server SDK `get`/`proxy` with `providerConfigKey` + `connectionId` |
| [Gmail `messages.list`](https://developers.google.com/gmail/api/reference/rest/v1/users.messages/list) | `maxResults` supported; `q` **not** available under `gmail.metadata` scope |
| [Gmail `messages.get`](https://developers.google.com/gmail/api/reference/rest/v1/users.messages/get) | `format=metadata` + `metadataHeaders` for minimal headers |

### Scope and format used

| Setting | Value |
|---------|--------|
| Nango integration | `google-mail` |
| OAuth scope preference | `gmail.metadata` when configured in Nango (read headers/labels only) |
| List endpoint | `GET /gmail/v1/users/me/messages` |
| Detail endpoint | `GET /gmail/v1/users/me/messages/{id}?format=metadata` |
| `metadataHeaders` | `From`, `To`, `Date` only — **no Subject** in this PR |
| Formats avoided | `full`, `raw` |
| Message limit | 1–50 (`GMAIL_READONLY_MAX_SAFE_MESSAGE_LIMIT`) |
| Temporal window | Applied in-memory after metadata fetch when `gmail.metadata` disallows `q` |

### Fields discarded immediately

Message ID, thread ID, subject, snippet, body, HTML, raw payload, attachment names/IDs, Nango/Gmail responses, OAuth tokens.

## Architecture

```txt
executeApplyFlowGmailReadOnlyRuntimeBoundary
  → flags + consent + connectionVerified + secret
  → createGmailReadOnlyNangoRuntimeAdapter
    → createGmailNangoRuntimeMetadataProvider (Nango SDK, server-only)
    → deriveGmailRuntimeSignalsFromMetadata (conservative, separate from sandbox)
    → GmailReadOnlyAdapterResult
```

ApplyFlow location: `apps/applyflow/src/lib/provider-runtime/`

| Module | Role |
|--------|------|
| `gmail-readonly-nango-provider.ts` | Nango `listConnections` + Gmail metadata fetch |
| `gmail-runtime-normalization.ts` | Domain extraction, header parsing |
| `gmail-runtime-classifier.ts` | Conservative runtime signals (empty in v1) |
| `gmail-readonly-nango-adapter.ts` | `GmailReadOnlyAdapter` for `runtime: "nango"` |
| `gmail-readonly-runtime-boundary.ts` | Feature flags, consent, verification gates |

No dedicated HTTP route for Gmail alone — the Gmail boundary is invoked server-side by the opt-in provider-derived runtime preview (`POST /provider-runtime/nango/derived-preview`). See [PROVIDER-DERIVED-RUNTIME-PREVIEW.md](./PROVIDER-DERIVED-RUNTIME-PREVIEW.md).

## Ephemeral metadata produced

`GmailEphemeralMessageMetadata` only:

- `occurredAt` (from `Date` header)
- `direction` (`unknown` when user address cannot be determined safely)
- `senderDomain`, `recipientDomains` (domains only)
- `hasAttachment` (`false` — attachment parts are not inspected)
- `labels` (Gmail system label IDs only)
- `threadMessageCount` omitted (would require thread ID retention)

## Runtime classifier

**Separate from sandbox.** Does not use `career.*` labels. First runtime release returns `[]` unless future PRs add documented metadata-only rules with unequivocal evidence.

Does **not** infer `interview_likely`, `offer_likely`, or `rejection_likely` from domains or timestamps alone.

## Gates

All must pass before Nango SDK is called:

1. `CAREER_PROVIDER_RUNTIME_ENABLED`
2. `NANGO_RUNTIME_ENABLED`
3. `GMAIL_PROVIDER_ENABLED`
4. `NANGO_SECRET_KEY` (server-only)
5. Explicit user consent
6. `connectionVerified: true`
7. Valid `GmailReadOnlyAdapterRequest` (limits, window)

## Result behaviour

| Case | Outcome |
|------|---------|
| Gate failure | `blocked`, no SDK call |
| Success | `completed`, `processedMessageCount` may be > 0, `signals` may be `[]` |
| SDK/Gmail failure | `error`, sanitized message, no raw payload |

Invariant flags: `importedRawMessages: false`, `retainedBodies: false`, `hasToken: false`, etc.

## What this does not claim

Do **not** state:

- Gmail sync complete
- Emails imported
- Recruiter messages detected automatically
- CareerBundle enriched from production Gmail
- Background sync active

## Related docs

- [Gmail Read-Only Adapter Contract](./GMAIL-READONLY-ADAPTER-CONTRACT.md)
- [Gmail Read-Only Sandbox Adapter](./GMAIL-READONLY-SANDBOX-ADAPTER.md)
- [Provider-Derived Runtime Composition](./PROVIDER-DERIVED-RUNTIME-COMPOSITION.md)
- [Sync Data Boundaries](./SYNC-DATA-BOUNDARIES.md)
- [Nango Gmail/Calendar Plan](./NANGO-GMAIL-CALENDAR-PLAN.md)
