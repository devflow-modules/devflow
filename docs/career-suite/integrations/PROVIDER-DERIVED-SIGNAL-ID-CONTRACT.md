# Provider-Derived Signal ID Contract

Provider-derived signal IDs use a **runtime-neutral, deterministic internal format** shared by sandbox adapters, runtime adapters, composition, review, proposal, and export.

## Purpose

The identifier labels a **derived internal signal** inside the Career Suite pipeline. It does **not** represent:

- Gmail, Calendar, or Nango provider identifiers
- message, thread, event, or calendar IDs
- email addresses, domains, or message content
- sandbox vs runtime execution origin

## Format (version 1)

```txt
provider-signal-{source}-{kind}-{timestamp-normalizado}-{sequence}
```

| Segment | Values | Notes |
|---------|--------|-------|
| Prefix | `provider-signal` | Fixed literal |
| `source` | `gmail` \| `calendar` | Semantic channel, not provider credentials |
| `kind` | `ProviderDerivedSignalKind` | Underscore-separated kind slug |
| `timestamp-normalizado` | UTC ISO instant, filename-safe | Colons and dots replaced with `-` |
| `sequence` | `001`, `002`, … | 1-based integer, zero-padded to 3 digits |

### Examples

```txt
provider-signal-gmail-application_detected-2026-06-11T09-00-00-000Z-001
provider-signal-calendar-interview_scheduled-2026-06-20T14-00-00-000Z-001
```

## Builder

Location: `packages/career-sync/src/provider-derived-signals/signal-id.ts`

```ts
createProviderDerivedSignalId({
  source: "gmail" | "calendar",
  kind: ProviderDerivedSignalKind,
  occurredAt: string, // ISO 8601
  sequence: number,   // positive integer, 1-based in classifiers
}): string | undefined;
```

Rules:

- Pure and deterministic — no `Date.now()`, `Math.random()`, or `randomUUID()`
- `occurredAt` is normalized to UTC via `toISOString()` before filename-safe encoding
- Equivalent offsets for the same instant produce the same temporal component
- Invalid input returns `undefined`

## Validator

```ts
isProviderDerivedSignalId(value: unknown): value is string;
```

Rejects legacy sandbox-labeled IDs (e.g. `gmail-sandbox-*`, `calendar-sandbox-*`) and malformed strings.

## Integration points

| Layer | Usage |
|-------|--------|
| Gmail sandbox classifier | Assigns IDs when deriving signals from ephemeral metadata |
| Calendar sandbox classifier | Assigns IDs when deriving signals from sandbox events |
| Runtime classifiers | Must use the same builder when signals are produced |
| Composition / deduplication | `id` participates in tie-break ordering only |
| Review fingerprint | Includes `signal.id`; ID changes invalidate stale review |
| Enrichment export v1 | `enrichment.combinedSignals[].id` may include neutral IDs; export schema unchanged |

## What IDs are not

- Not provider IDs — cannot re-fetch Gmail/Calendar/Nango data
- Not persisted by ApplyFlow — in-memory and export-local only
- Not an import API — no stable cross-session guarantee beyond determinism for the same inputs
- Not proof of sandbox or runtime origin

## Legacy IDs

Exports created before this refactor may contain `gmail-sandbox-*` or `calendar-sandbox-*` values in `enrichment.combinedSignals[].id`. Those documents remain valid JSON under export schema v1; the prefix described the old builder, not provider origin. New exports use the neutral format.

## Public exports

From `@devflow/career-sync`:

- `createProviderDerivedSignalId`
- `isProviderDerivedSignalId`
- `normalizeTimestampForProviderDerivedSignalId`
- `PROVIDER_DERIVED_SIGNAL_ID_PREFIX`
- `CreateProviderDerivedSignalIdInput`
