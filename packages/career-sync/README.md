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

## Gmail read-only sync prototype

The Gmail sync prototype transforms Gmail-like or Nango Gmail-like message objects into safe derived career signals.

It does not call Gmail, does not require OAuth, does not persist raw provider data, and does not send emails.

```ts
import {
  buildGmailSyncPreview,
  buildCareerBundleGmailEnrichment,
  sampleRecruiterEmail,
  sampleInterviewInviteEmail,
} from "@devflow/career-sync";

const preview = buildGmailSyncPreview({
  messages: [sampleRecruiterEmail, sampleInterviewInviteEmail],
});
const enrichment = buildCareerBundleGmailEnrichment(preview.signals, {
  generatedAt: "2026-06-09T12:00:00.000Z",
});
```

## Calendar read-only sync prototype

The Calendar sync prototype transforms Calendar-like or Nango Calendar-like event objects into safe derived career signals.

It does not call Google Calendar, does not require OAuth, does not persist raw provider data, does not retain meeting links, and does not create events.

```ts
import {
  buildCalendarSyncPreview,
  buildCareerBundleCalendarEnrichment,
  sampleInterviewCalendarEvent,
  sampleTechnicalCalendarEvent,
} from "@devflow/career-sync";

const preview = buildCalendarSyncPreview(
  { events: [sampleInterviewCalendarEvent, sampleTechnicalCalendarEvent] },
  { now: "2026-06-09T12:00:00.000Z" },
);
const enrichment = buildCareerBundleCalendarEnrichment(preview.signals, {
  generatedAt: "2026-06-09T12:00:00.000Z",
});
```
