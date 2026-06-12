# Career Suite Integrations

This folder documents **external integration labs** for the Career Suite. These are experimentation and acceleration paths — not mandatory product runtime.

## Current order

1. **[Provider consent integration architecture](./PROVIDER-CONSENT-ARCHITECTURE.md)** — consent, revocation, least-data, and adapter boundaries before real OAuth
2. **[LibreChat + MCP lab](./LIBRECHAT-MCP-LAB.md)** — local agent UI over deterministic tools
3. **[LibreChat Local MCP Wiring](./LIBRECHAT-LOCAL-WIRING.md)** — connect upstream LibreChat to `@devflow/career-agents-mcp` stdio
4. **[Nango Gmail/Calendar Plan](./NANGO-GMAIL-CALENDAR-PLAN.md)** — OAuth/sync adapter (docs + sandbox contracts; no runtime OAuth in apps)
5. **[Sync Data Boundaries](./SYNC-DATA-BOUNDARIES.md)** — privacy rules for Gmail/Calendar derived signals and CareerBundle sync enrichment
6. **Multi-agent orchestration** — after MCP tools and sync boundaries are stable
7. **OpenClaw POC** — optional automation surface; not product-critical

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
| MCP SDK | **Implemented locally** | `@devflow/career-agents-mcp` stdio transport |
| LibreChat + MCP lab | **Lab docs only** | No LibreChat product dependency |
| LibreChat local wiring | **Documented** | [LIBRECHAT-LOCAL-WIRING.md](./LIBRECHAT-LOCAL-WIRING.md) |
| Career Agents MCP Server | **Scaffold + stdio transport** | `@devflow/career-agents-mcp` in monorepo |
| CareerBundle MCP Server | **Candidate (Phase 2)** | Not implemented |
| Nango | **Future provider adapter** | [NANGO-GMAIL-CALENDAR-PLAN.md](./NANGO-GMAIL-CALENDAR-PLAN.md) — no runtime yet |
| Gmail / Calendar | **Future consent-based providers** | No live connector yet — sandbox fixtures in `@devflow/career-sync` |
| CareerBundle sync enrichment | **Implemented** (core adapter, export/import, IL preview) | Public case: [CAREER-SUITE.md](../../public-cases/CAREER-SUITE.md#sync-enrichment-flow) |
| OpenClaw POC | **Future** | Not implemented |

## Related docs

- [Career Suite overview](../README.md)
- [Provider consent integration architecture](./PROVIDER-CONSENT-ARCHITECTURE.md)
- [LibreChat Local MCP Wiring](./LIBRECHAT-LOCAL-WIRING.md)
- [Nango Gmail/Calendar Plan](./NANGO-GMAIL-CALENDAR-PLAN.md)
- [Sync Data Boundaries](./SYNC-DATA-BOUNDARIES.md)
- [`@devflow/career-agents` README](../../../packages/career-agents/README.md)
- [`@devflow/career-agents-mcp` README](../../../packages/career-agents-mcp/README.md)
