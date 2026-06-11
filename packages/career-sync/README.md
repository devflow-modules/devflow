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

## Nango sandbox adapter

This package includes simulated Nango payload mappers for future Gmail and Google Calendar sync.

No Nango SDK, OAuth flow, provider call, token handling, or persistence is included in this package foundation.

Nango payloads are mapped into safe local contracts before signal extraction.

```ts
import {
  extractSignalsFromNangoGmail,
  sampleNangoRecruiterMessage,
} from "@devflow/career-sync";

const signals = extractSignalsFromNangoGmail([sampleNangoRecruiterMessage]);
// signals[0].processStage === "screening"
```
