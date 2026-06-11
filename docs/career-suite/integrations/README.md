# Career Suite Integrations

This folder documents **external integration labs** for the Career Suite. These are experimentation and acceleration paths — not mandatory product runtime.

## Current order

1. **[LibreChat + MCP lab](./LIBRECHAT-MCP-LAB.md)** — local agent UI over deterministic tools
2. **[LibreChat Local MCP Wiring](./LIBRECHAT-LOCAL-WIRING.md)** — connect upstream LibreChat to `@devflow/career-agents-mcp` stdio
3. **[Nango Gmail/Calendar Plan](./NANGO-GMAIL-CALENDAR-PLAN.md)** — OAuth/sync adapter (docs phase; not in repo)
4. **[Sync Data Boundaries](./SYNC-DATA-BOUNDARIES.md)** — privacy rules for future Gmail/Calendar sync
5. **Multi-agent orchestration** — after MCP tools and sync boundaries are stable
6. **OpenClaw POC** — optional automation surface; not product-critical

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
- **Interview Lab** — import, Resume Match (`/career/ats`), practice prep

Integrations **accelerate** experimentation; they do **not** replace this stack.

## Status

| Integration | Status | In repo? |
|-------------|--------|----------|
| LibreChat + MCP lab | **Documented lab plan** | Docs only — no LibreChat dependency |
| LibreChat local wiring | **Documented** | [LIBRECHAT-LOCAL-WIRING.md](./LIBRECHAT-LOCAL-WIRING.md) |
| Career Agents MCP Server | **Scaffold + stdio transport** | `@devflow/career-agents-mcp` in monorepo |
| CareerBundle MCP Server | **Candidate (Phase 2)** | Not implemented |
| Nango Gmail/Calendar | **Planned / docs phase** | [NANGO-GMAIL-CALENDAR-PLAN.md](./NANGO-GMAIL-CALENDAR-PLAN.md) |
| OpenClaw POC | **Future** | Not implemented |

## Related docs

- [Career Suite overview](../README.md)
- [LibreChat Local MCP Wiring](./LIBRECHAT-LOCAL-WIRING.md)
- [Nango Gmail/Calendar Plan](./NANGO-GMAIL-CALENDAR-PLAN.md)
- [Sync Data Boundaries](./SYNC-DATA-BOUNDARIES.md)
- [`@devflow/career-agents` README](../../../packages/career-agents/README.md)
- [`@devflow/career-agents-mcp` README](../../../packages/career-agents-mcp/README.md)
