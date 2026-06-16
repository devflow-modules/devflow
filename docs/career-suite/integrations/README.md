# Career Suite Integrations

This folder documents **external integration labs** for the Career Suite. These are experimentation and acceleration paths — not mandatory product runtime.

## Current order

1. **[Provider consent integration architecture](./PROVIDER-CONSENT-ARCHITECTURE.md)** — consent, revocation, least-data, and adapter boundaries before real OAuth
2. **[Provider runtime feature flags](./PROVIDER-RUNTIME-FEATURE-FLAGS.md)** — default-off gates before any real OAuth/Nango/Gmail/Calendar runtime
3. **[Real Provider Runtime Readiness Checklist](./REAL-PROVIDER-RUNTIME-READINESS-CHECKLIST.md)** — final gates before any real OAuth/Nango/Gmail/Calendar runtime PR
4. **[Provider Runtime Environment and Secrets Boundary](./PROVIDER-RUNTIME-ENV-SECRETS-BOUNDARY.md)** — server/runtime-only flags and secrets before real OAuth
5. **[Gmail Read-Only Adapter Contract](./GMAIL-READONLY-ADAPTER-CONTRACT.md)** — privacy-first derived-signal contract (no Gmail API runtime)
6. **[Calendar Read-Only Adapter Contract](./CALENDAR-READONLY-ADAPTER-CONTRACT.md)** — privacy-first derived-signal contract (no Calendar API runtime)
7. **[Gmail Read-Only Sandbox Adapter](./GMAIL-READONLY-SANDBOX-ADAPTER.md)** — deterministic sandbox implementation of `GmailReadOnlyAdapter`
8. **[Calendar Read-Only Sandbox Adapter](./CALENDAR-READONLY-SANDBOX-ADAPTER.md)** — deterministic sandbox implementation of `CalendarReadOnlyAdapter`
9. **[Provider-Derived Sandbox Composition](./PROVIDER-DERIVED-SANDBOX-COMPOSITION.md)** — deterministic composition of Gmail + Calendar sandbox signals
9b. **[Provider-Derived Signal ID Contract](./PROVIDER-DERIVED-SIGNAL-ID-CONTRACT.md)** — runtime-neutral deterministic internal signal IDs
9c. **[Unified Sync Enrichment Contract](./UNIFIED-SYNC-ENRICHMENT-CONTRACT.md)** — canonical `CareerBundleUnifiedSyncEnrichment` validator
10. **[Provider-Derived Enrichment Adapter](./PROVIDER-DERIVED-ENRICHMENT-ADAPTER.md)** — compatibility adapter to `CareerBundleUnifiedSyncEnrichment`
11. **[Gmail Read-Only Nango Runtime Adapter](./GMAIL-READONLY-NANGO-RUNTIME-ADAPTER.md)** — server-only Gmail metadata via Nango (ApplyFlow)
12. **[Calendar Read-Only Nango Runtime Adapter](./CALENDAR-READONLY-NANGO-RUNTIME-ADAPTER.md)** — server-only Calendar metadata via Nango (ApplyFlow)
13. **[Provider-Derived Runtime Composition](./PROVIDER-DERIVED-RUNTIME-COMPOSITION.md)** — server-only Gmail + Calendar runtime signal composition (ApplyFlow)
14. **[Provider-Derived Runtime Preview](./PROVIDER-DERIVED-RUNTIME-PREVIEW.md)** — opt-in read-only preview of derived signals (ApplyFlow)
15. **[Provider-Derived Runtime Review](./PROVIDER-DERIVED-RUNTIME-REVIEW.md)** — in-memory review of preview signals (ApplyFlow)
16. **[Provider-Derived Enrichment Proposal](./PROVIDER-DERIVED-ENRICHMENT-PROPOSAL.md)** — ephemeral enrichment proposal from selected signals (ApplyFlow)
17. **[Provider-Derived Enrichment Proposal Export](./PROVIDER-DERIVED-ENRICHMENT-PROPOSAL-EXPORT.md)** — local JSON download of ready proposals (ApplyFlow)
17b. **[Provider-Derived Enrichment Proposal Export Validation](./PROVIDER-DERIVED-ENRICHMENT-PROPOSAL-EXPORT-VALIDATION.md)** — standalone v1 document validator (`@devflow/career-sync`)
17c. **[Provider-Derived Enrichment Proposal Export Lifecycle](./PROVIDER-DERIVED-ENRICHMENT-PROPOSAL-LIFECYCLE.md)** — lifecycle, trust model, export-only decision ([ADR-002](../../adr/ADR-002-ENRICHMENT-PROPOSAL-EXPORT-ONLY.md))
17d. **[Provider-Derived Career Insights](./PROVIDER-DERIVED-CAREER-INSIGHTS.md)** — read-only aggregated insights from in-memory signals (ApplyFlow)
18. **[LibreChat + MCP lab](./LIBRECHAT-MCP-LAB.md)** — local agent UI over deterministic tools
18. **[LibreChat Local MCP Wiring](./LIBRECHAT-LOCAL-WIRING.md)** — connect upstream LibreChat to `@devflow/career-agents-mcp` stdio
19. **[Nango Gmail/Calendar Plan](./NANGO-GMAIL-CALENDAR-PLAN.md)** — OAuth/sync adapter (docs + sandbox contracts; no runtime OAuth in apps)
20. **[Sync Data Boundaries](./SYNC-DATA-BOUNDARIES.md)** — privacy rules for Gmail/Calendar derived signals and CareerBundle sync enrichment
21. **Multi-agent orchestration** — after MCP tools and sync boundaries are stable
22. **OpenClaw POC** — optional automation surface; not product-critical

See also: **[MCP server candidates](./MCP-SERVER-CANDIDATES.md)**.

## Product principles (unchanged)

| Principle | Meaning for integrations |
|-----------|---------------------------|
| **Local-first** | Career data stays in the browser or explicit user export unless the user opts into a lab setup |
| **Privacy-first** | No CareerBundle in URLs; no silent upload to DevFlow servers |
| **Deterministic core** | [`@devflow/career-agents`](../../../packages/career-agents/) (when present in the monorepo) owns scores, gaps, and skill detection — integrations explain, they do not replace |
| **AI opt-in** | LLM layers (LibreChat, OpenAI coaching in Interview Lab) are optional and user-initiated |
| **No auto-submit** | Labs must not apply to jobs, send email, or mutate ApplyFlow state without explicit user action |

## What stays in the product today

- **`@devflow/career-agents`** — deterministic job/resume/ATS analysis (package)
- **`CareerBundle` JSON** — typed handoff contract (`@devflow/career-core`)
- **ApplyFlow** — capture and organise applications
- **Interview Lab** — import, Resume Match (`/career/ats`), practice prep, **read-only sync enrichment preview** on import (not persisted)

Integrations **accelerate** experimentation; they do **not** replace this stack.

## Sync enrichment (implemented contract)

| Layer | Role |
|-------|------|
| **`@devflow/career-sync`** | Derived Gmail/Calendar signals, unified `CareerBundleUnifiedSyncEnrichment` — fixtures/sandbox only |
| **`@devflow/career-core`** | Privacy validation, optional attach, export/import helpers |
| **Interview Lab** | Aggregated read-only preview when imported bundle includes valid `syncEnrichment` |

No OAuth runtime, no Nango SDK in apps, no provider API calls, no sync persistence in Interview Lab today.

## Status

| Integration | Status | In repo? |
|-------------|--------|----------|
| Provider consent architecture | **Documented** | [PROVIDER-CONSENT-ARCHITECTURE.md](./PROVIDER-CONSENT-ARCHITECTURE.md) — planning only |
| Provider runtime feature flags | **Documented** | [PROVIDER-RUNTIME-FEATURE-FLAGS.md](./PROVIDER-RUNTIME-FEATURE-FLAGS.md) — default off |
| Real provider runtime readiness | **Documented** | [REAL-PROVIDER-RUNTIME-READINESS-CHECKLIST.md](./REAL-PROVIDER-RUNTIME-READINESS-CHECKLIST.md) — pre-OAuth gates |
| Provider runtime env/secrets boundary | **Documented** | [PROVIDER-RUNTIME-ENV-SECRETS-BOUNDARY.md](./PROVIDER-RUNTIME-ENV-SECRETS-BOUNDARY.md) — server/runtime only |
| Gmail read-only adapter contract | **Contract only** | [GMAIL-READONLY-ADAPTER-CONTRACT.md](./GMAIL-READONLY-ADAPTER-CONTRACT.md) — no Gmail API runtime |
| Gmail read-only sandbox adapter | **Sandbox impl** | [GMAIL-READONLY-SANDBOX-ADAPTER.md](./GMAIL-READONLY-SANDBOX-ADAPTER.md) — fake fixtures only |
| Gmail read-only Nango runtime adapter | **Server runtime** | [GMAIL-READONLY-NANGO-RUNTIME-ADAPTER.md](./GMAIL-READONLY-NANGO-RUNTIME-ADAPTER.md) — metadata only, no CareerBundle attach |
| Calendar read-only adapter contract | **Contract only** | [CALENDAR-READONLY-ADAPTER-CONTRACT.md](./CALENDAR-READONLY-ADAPTER-CONTRACT.md) — no Calendar API runtime |
| Calendar read-only sandbox adapter | **Sandbox impl** | [CALENDAR-READONLY-SANDBOX-ADAPTER.md](./CALENDAR-READONLY-SANDBOX-ADAPTER.md) — fake fixtures only |
| Calendar read-only Nango runtime adapter | **Server runtime** | [CALENDAR-READONLY-NANGO-RUNTIME-ADAPTER.md](./CALENDAR-READONLY-NANGO-RUNTIME-ADAPTER.md) — metadata only, no CareerBundle attach |
| Provider-derived sandbox composition | **Sandbox impl** | [PROVIDER-DERIVED-SANDBOX-COMPOSITION.md](./PROVIDER-DERIVED-SANDBOX-COMPOSITION.md) — Gmail + Calendar signal composition |
| Provider-derived runtime composition | **Server runtime** | [PROVIDER-DERIVED-RUNTIME-COMPOSITION.md](./PROVIDER-DERIVED-RUNTIME-COMPOSITION.md) — Gmail + Calendar runtime signals, no CareerBundle attach |
| Provider-derived runtime preview | **Server runtime + UI** | [PROVIDER-DERIVED-RUNTIME-PREVIEW.md](./PROVIDER-DERIVED-RUNTIME-PREVIEW.md) — opt-in ephemeral preview, no persistence |
| Provider-derived runtime review | **UI only** | [PROVIDER-DERIVED-RUNTIME-REVIEW.md](./PROVIDER-DERIVED-RUNTIME-REVIEW.md) — in-memory signal selection, no persistence |
| Provider-derived enrichment proposal | **UI only** | [PROVIDER-DERIVED-ENRICHMENT-PROPOSAL.md](./PROVIDER-DERIVED-ENRICHMENT-PROPOSAL.md) — ephemeral proposal from selected signals, no persistence |
| Provider-derived enrichment proposal export | **UI only** | [PROVIDER-DERIVED-ENRICHMENT-PROPOSAL-EXPORT.md](./PROVIDER-DERIVED-ENRICHMENT-PROPOSAL-EXPORT.md) — browser-side JSON download, no upload |
| Provider-derived enrichment proposal export validation | **Package API** | [PROVIDER-DERIVED-ENRICHMENT-PROPOSAL-EXPORT-VALIDATION.md](./PROVIDER-DERIVED-ENRICHMENT-PROPOSAL-EXPORT-VALIDATION.md) — pure v1 validator, no import |
| Provider-derived enrichment proposal export lifecycle | **Documented** | [PROVIDER-DERIVED-ENRICHMENT-PROPOSAL-LIFECYCLE.md](./PROVIDER-DERIVED-ENRICHMENT-PROPOSAL-LIFECYCLE.md) — export-only artifact; [ADR-002](../../adr/ADR-002-ENRICHMENT-PROPOSAL-EXPORT-ONLY.md) |
| Provider-derived career insights | **UI only** | [PROVIDER-DERIVED-CAREER-INSIGHTS.md](./PROVIDER-DERIVED-CAREER-INSIGHTS.md) — read-only session metrics, no persistence |
| Proposal export import workflow | **Explicitly deferred** | Not planned in current cycle — see lifecycle doc |
| Provider-derived enrichment adapter | **Sandbox impl** | [PROVIDER-DERIVED-ENRICHMENT-ADAPTER.md](./PROVIDER-DERIVED-ENRICHMENT-ADAPTER.md) — maps to `CareerBundleUnifiedSyncEnrichment` |
| MCP SDK | **Implemented locally** | `@devflow/career-agents-mcp` stdio transport |
| LibreChat + MCP lab | **Lab docs only** | No LibreChat product dependency |
| LibreChat local wiring | **Documented** | [LIBRECHAT-LOCAL-WIRING.md](./LIBRECHAT-LOCAL-WIRING.md) |
| Career Agents MCP Server | **Scaffold + stdio transport** | `@devflow/career-agents-mcp` in monorepo |
| CareerBundle MCP Server | **Candidate (Phase 2)** | Not implemented |
| Nango | **Future provider adapter** | [NANGO-GMAIL-CALENDAR-PLAN.md](./NANGO-GMAIL-CALENDAR-PLAN.md) — no runtime yet |
| Gmail / Calendar | **Gmail + Calendar runtime (metadata)** | ApplyFlow server-only read-only Gmail and Calendar via Nango — no CareerBundle auto-attach |
| CareerBundle sync enrichment | **Implemented** (core adapter, export/import, IL preview) | Public case: [CAREER-SUITE.md](../../public-cases/CAREER-SUITE.md#sync-enrichment-flow) |
| OpenClaw POC | **Future** | Not implemented |

## Related docs

- [Career Suite overview](../README.md)
- [Provider consent integration architecture](./PROVIDER-CONSENT-ARCHITECTURE.md)
- [Provider runtime feature flags](./PROVIDER-RUNTIME-FEATURE-FLAGS.md)
- [Real Provider Runtime Readiness Checklist](./REAL-PROVIDER-RUNTIME-READINESS-CHECKLIST.md)
- [Provider Runtime Environment and Secrets Boundary](./PROVIDER-RUNTIME-ENV-SECRETS-BOUNDARY.md)
- [Gmail Read-Only Adapter Contract](./GMAIL-READONLY-ADAPTER-CONTRACT.md)
- [Gmail Read-Only Sandbox Adapter](./GMAIL-READONLY-SANDBOX-ADAPTER.md)
- [Gmail Read-Only Nango Runtime Adapter](./GMAIL-READONLY-NANGO-RUNTIME-ADAPTER.md)
- [Calendar Read-Only Adapter Contract](./CALENDAR-READONLY-ADAPTER-CONTRACT.md)
- [Calendar Read-Only Sandbox Adapter](./CALENDAR-READONLY-SANDBOX-ADAPTER.md)
- [Provider-Derived Sandbox Composition](./PROVIDER-DERIVED-SANDBOX-COMPOSITION.md)
- [Provider-Derived Enrichment Adapter](./PROVIDER-DERIVED-ENRICHMENT-ADAPTER.md)
- [Provider-Derived Enrichment Proposal Export Lifecycle](./PROVIDER-DERIVED-ENRICHMENT-PROPOSAL-LIFECYCLE.md)
- [ADR-002: export-only](../../adr/ADR-002-ENRICHMENT-PROPOSAL-EXPORT-ONLY.md)
- [LibreChat Local MCP Wiring](./LIBRECHAT-LOCAL-WIRING.md)
- [Nango Gmail/Calendar Plan](./NANGO-GMAIL-CALENDAR-PLAN.md)
- [Sync Data Boundaries](./SYNC-DATA-BOUNDARIES.md)
- [`@devflow/career-agents` README](../../../packages/career-agents/README.md)
- [`@devflow/career-agents-mcp` README](../../../packages/career-agents-mcp/README.md)
