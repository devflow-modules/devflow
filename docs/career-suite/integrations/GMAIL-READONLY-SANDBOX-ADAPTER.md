# Gmail Read-Only Sandbox Adapter

Career Suite includes a deterministic Gmail read-only sandbox adapter using fake metadata fixtures.

The sandbox adapter does not call Gmail, import real messages, retain bodies or snippets, expose provider tokens, or update applications automatically.

## Status

| Item | State |
|------|--------|
| `GmailReadOnlyAdapter` contract | **Defined** in `gmail-readonly-adapter/` |
| Sandbox adapter implementation | **Implemented** — `createGmailReadOnlySandboxAdapter` |
| Gmail API runtime | **Not implemented** |
| Nango proxy for Gmail | **Not implemented** |

## Objective

Provide a **sandbox-only**, **deterministic**, **fixture-driven** implementation of `GmailReadOnlyAdapter` that:

1. Validates `GmailReadOnlyAdapterRequest` via existing contract helpers
2. Reads fake `GmailEphemeralMessageMetadata` from an injectable in-memory provider
3. Derives `GmailDerivedSignal` using label-based rules only
4. Returns a client-safe `GmailReadOnlyAdapterResult`

## Relationship to legacy `gmail-sync`

| Module | Role |
|--------|------|
| `gmail-sync` | Legacy prototype/preview using fixtures and `CareerSyncSignal` |
| `gmail-readonly-adapter` contract | Formal read-only boundary with verification gates |
| `gmail-readonly-adapter` sandbox | **This PR** — implements `GmailReadOnlyAdapter` with `GmailDerivedSignal` |

The sandbox adapter does **not** replace or break `gmail-sync` APIs in this PR.

## Fixtures

Sandbox fixtures are clearly marked demo/fake data:

- `gmail-application-detected`
- `gmail-interview-likely`
- `gmail-follow-up-required`
- `gmail-recruiter-response`
- `gmail-rejection-likely`
- `gmail-offer-likely`
- `gmail-no-career-signal`

Domains use reserved examples only: `acme.example`, `beta.example`, `jobs.example`, `candidate.example`.

## Classification rules

Deterministic mapping from sandbox labels to signal kinds:

| Label | Signal kind |
|-------|-------------|
| `career.application` | `application_detected` |
| `career.interview` | `interview_likely` |
| `career.follow_up` | `follow_up_required` |
| `career.recruiter_response` | `recruiter_response_detected` |
| `career.rejection` | `rejection_likely` |
| `career.offer` | `offer_likely` |

Company is derived only from `company.{slug}` labels (e.g. `company.acme` → `Acme`). No inference from real domains.

Confidence is fixed per kind (0.75–0.90). All signals require user review.

## Public API

```ts
createGmailSandboxMetadataProvider(fixture: GmailSandboxFixture): GmailReadOnlyMetadataProvider;

createGmailReadOnlySandboxAdapter(input: {
  metadataProvider: GmailReadOnlyMetadataProvider;
}): GmailReadOnlyAdapter;

deriveGmailSignalsFromEphemeralMetadata(metadata: GmailEphemeralMessageMetadata[]): GmailDerivedSignal[];
```

## Adapter behaviour

| Case | Result |
|------|--------|
| `runtime !== "sandbox"` | `blocked` (`runtime_not_supported`) |
| Contract validation fails | `blocked` with contract reasons |
| Success | `completed` with derived signals |
| Provider failure | `error` with generic safe message |

Invariant flags remain `importedRawMessages: false`, `retainedBodies: false`, `hasToken: false`, etc.

## What this does not claim

Do **not** state:

- Gmail integration active
- Gmail messages imported
- Production inbox connected
- Recruiter emails detected in production

## Related docs

- [Gmail Read-Only Adapter Contract](./GMAIL-READONLY-ADAPTER-CONTRACT.md)
- [Sync Data Boundaries](./SYNC-DATA-BOUNDARIES.md)
- [Nango Gmail/Calendar Plan](./NANGO-GMAIL-CALENDAR-PLAN.md)
