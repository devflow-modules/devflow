# Sync Data Boundaries

Privacy and data-minimization rules for **future** Gmail and Google Calendar sync via Nango in the Career Suite. Applies to all sync adapters, MCP tools, and agents that consume provider data.

**Status:** Planning document for production sync. Deterministic normalizers live in `@devflow/career-sync` (foundation only — no OAuth, no Nango SDK, no provider calls).

**Phase 2 foundation:** `@devflow/career-sync` defines deterministic sync signal contracts before Nango OAuth integration.

Simulated Nango payload mappers live in `@devflow/career-sync` (`mapNangoGmailMessage`, `mapNangoCalendarEvent`) and feed the same deterministic extractors — no OAuth, SDK, or raw persistence.

Gmail read-only sync preview (`buildGmailSyncPreview`, `buildCareerBundleGmailEnrichment`) produces derived signals and CareerBundle enrichment metadata from fixtures only — no raw messages, attachments, or provider calls.

Calendar read-only sync preview (`buildCalendarSyncPreview`, `buildCareerBundleCalendarEnrichment`) produces derived signals and CareerBundle enrichment metadata from fixtures only — no raw events, meeting links, or provider calls.

Calendar sync previews must not retain meeting links, raw event descriptions, private unrelated events, or provider payloads. Derived signals should be reviewable and deletable by the user.

Unified CareerBundle sync enrichment must remain derived-signal-only. Gmail and Calendar raw inputs must not be embedded in CareerBundle. The user should be able to review and delete sync enrichment data.

### CareerBundle sync enrichment adapter

The CareerBundle core adapter recognizes safe sync enrichments produced by `@devflow/career-sync`. It only accepts derived, redacted, user-reviewable enrichment data and does not consume provider raw payloads.

## Principles

- **Privacy-first** — collect the minimum needed for career workflow hints
- **Least data required** — prefer derived metadata over raw provider payloads
- **Explicit user consent** — connect/disconnect per provider; clear scope at connect time
- **Read-only by default** — no send, no calendar writes in MVP sync phases
- **No auto-send** — sync must not reply to recruiters or schedule meetings automatically
- **No auto-submit** — sync must not apply to jobs or mutate ApplyFlow on its own
- **No raw inbox persistence by default** — store normalized signals unless user opts into more
- **Local-first MVP preserved** — Career Suite apps work without sync connected
- **AI opt-in** — agents and LLMs consume derived signals; no silent model training on mail/calendar
- **No CareerBundle in URL** — enriched metadata uses the same export/handoff rules as today

## Allowed derived signals

### Gmail (examples)

| Signal | Notes |
|--------|--------|
| Sender domain | e.g. `greenhouse.io`, `company.com` |
| Company name | Parsed or inferred; user-editable |
| Process stage | e.g. `screening`, `interview`, `rejection`, `offer` |
| Event type | e.g. `recruiter_outreach`, `interview_invite`, `take_home` |
| Received date | ISO timestamp |
| Action required | Boolean or enum; user-facing hint only |
| Confidence score | Deterministic classifier confidence 0–1 |

### Calendar (examples)

| Signal | Notes |
|--------|--------|
| Event date/time | Start/end for interview prep windows |
| Interview stage | e.g. `phone`, `technical`, `onsite` (from title heuristics) |
| Company hint | From title/organizer domain |
| Availability block type | e.g. `free`, `busy`, `focus` (coarse) |
| Reminder candidate | Suggested follow-up date — not auto-created |

## Restricted data (do not store by default)

- Full **raw email body** and HTML parts
- **Attachments** (PDFs, images, archives)
- **Personal unrelated emails** (friends, billing, newsletters) — filter before persistence
- **Private calendar descriptions** and attendee PII
- **Meeting links** (Zoom/Meet URLs) unless user explicitly keeps them per event
- **Credentials, refresh tokens, OAuth secrets** — Nango vault only; never logs or repo
- Provider **message IDs** in client-visible logs (use hashed references if needed)

If a future feature requires restricted fields, it needs **per-field opt-in** and an update to this document.

## Storage model

| Tier | MVP preference |
|------|----------------|
| **Derived metadata** | Default — small JSON records keyed to `CareerApplication.id` |
| **Redacted snippets** | Opt-in only — short excerpts user approves |
| **Raw provider payloads** | Avoid; if needed for debug, encrypted ephemeral store with TTL |

Prefer **browser-local** or **user-controlled export** for MVP experiments; any server-side store requires explicit product decision and deletion APIs.

## Agent and MCP access

- Agents (`@devflow/career-agents`, MCP tools, LibreChat) consume **derived signals** attached to applications or session context.
- **No raw Gmail/Calendar API responses** in tool inputs unless the user explicitly pastes them (same as resume/JD paste today).
- LLM narration must not invent statuses not present in derived signals.
- Deterministic scores from `@devflow/career-agents` remain authoritative; sync metadata is contextual only.

## User controls (required before production sync)

- Connect / disconnect provider
- Pause sync
- Review incoming signals before merge into ApplyFlow
- Delete synced signals (per application or bulk)
- Export synced metadata with CareerBundle (optional field block)

## Future deletion policy

- User must be able to **delete all synced signals** for a provider without deleting manual ApplyFlow rows.
- Disconnecting Nango should stop new fetches; local derived records should be purgeable.
- Retention limits (e.g. 90-day TTL for derived signals) should be documented when implementation starts.

## Related

- [Nango Gmail/Calendar Plan](./NANGO-GMAIL-CALENDAR-PLAN.md)
- [Integrations overview](./README.md)
