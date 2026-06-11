# @devflow/career-sync

Deterministic sync signal normalizers for Career Suite.

## Status

Foundation only. No OAuth, no Nango SDK, no provider calls.

## Principles

- privacy-first
- least data
- read-only by default
- no raw provider persistence
- no auto-send
- no auto-submit
- derived signals only

## Usage

```ts
import {
  extractGmailSignals,
  extractCalendarSignals,
  redactSensitiveText,
  shouldRetainRawProviderData,
  sampleRecruiterEmail,
} from "@devflow/career-sync";

const signals = extractGmailSignals([sampleRecruiterEmail]);
// signals[0].processStage === "screening"
// signals[0].rawRetained === false
```

## Future Nango adapter

Nango may feed raw provider-like objects into these normalizers later.
