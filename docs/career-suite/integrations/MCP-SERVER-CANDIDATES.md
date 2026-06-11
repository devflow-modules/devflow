# MCP Server Candidates

MCP servers described here are **candidates for lab and future optional layers**. None are required runtime dependencies of ApplyFlow or Interview Lab today.

## Career Agents MCP Server (Phase 1 — priority)

**Phase 1 scaffold:** [`@devflow/career-agents-mcp`](../../../packages/career-agents-mcp/) exposes deterministic handlers (`analyze_job`, `analyze_resume`, `match_resume_to_job`, `explain_gap_severity`) for local lab testing. MCP stdio transport is a follow-up PR.

**Purpose:** Expose deterministic Career Suite analysis tools to LibreChat or other MCP clients.

**Implementation sketch:** Node MCP server importing `@devflow/career-agents` (built from monorepo). Handlers are thin wrappers — no LLM, no network inside handlers.

### Tools

| Tool | Input (summary) | Output (summary) |
|------|-----------------|------------------|
| `analyze_job` | `{ title, company?, description }` | `JobAnalysisOutput` |
| `analyze_resume` | `ResumeAnalysisInput` | `ResumeAnalysisOutput` |
| `match_resume_to_job` | Job + resume analysis outputs (or raw text parsed by server) | `AtsMatchOutput` incl. `scoreBreakdown`, `gapSeverity` |
| `get_gap_severity` | `AtsMatchOutput` or match inputs | `gapSeverity[]` |
| `get_interview_topics` | `JobAnalysisOutput` | `interviewTopics[]` |

### Constraints

- Call **`@devflow/career-agents` only** for scoring and skill detection
- Return JSON matching package types; do not let the MCP host rewrite scores
- No persistence — stateless request/response per tool call
- No OAuth, no Gmail, no calendar in Phase 1

### Test bar

- Same inputs as `packages/career-agents/tests/` and `apps/interview-lab/src/lib/career-agents-adapter.test.ts` produce identical deterministic outputs

---

## CareerBundle MCP Server (Phase 2)

**Purpose:** Read and validate **CareerBundle JSON** for chat workflows that start from ApplyFlow export.

**Depends on:** `@devflow/career-core` (`parseCareerBundle`, `getInterviewReadyApplications`, etc.)

### Tools

| Tool | Description |
|------|-------------|
| `validate_career_bundle` | Parse + Zod validate; return ok/error |
| `summarize_application` | Human-readable summary for one `CareerApplication` |
| `extract_job_context` | Map application → `JobAnalysisInput` for downstream `analyze_job` |
| `extract_resume_context` | Map candidate metadata + skills → `ResumeAnalysisInput` hints |

### Constraints

- Bundle payload passed as **tool argument** or **user-attached file** — never from URL
- Validation errors must surface clearly; no partial silent drops
- Does not mutate ApplyFlow or Interview Lab storage

---

## Future Gmail/Calendar MCP (Phase 3 — deferred)

**Purpose:** Interview scheduling and email context for prep — **only after** Nango sync is planned and documented.

### Approach

- **Nango** for OAuth and token refresh — not raw OAuth inside MCP handlers
- MCP tools read **synced metadata** (event title, time, attendees) — not full mailbox scraping by default
- Explicit user consent per connection; local-first defaults preserved

### Non-goals for Phase 3

- Auto-send application emails
- Auto-schedule interviews without user confirmation
- Storing credentials in the monorepo

---

## OpenClaw / automation POC (Phase 4 — optional)

Exploratory only. Any automation must respect:

- No auto-submit
- User-visible actions only
- Career Agents core for any “match” or “gap” language

Document separately when the POC starts; not part of Phase 1–2.

---

## Priority summary

| Phase | Server | Status |
|-------|--------|--------|
| **1** | Career Agents MCP Server | **Scaffold shipped** — `@devflow/career-agents-mcp` handlers; transport next |
| **2** | CareerBundle MCP Server | Planned after Phase 1 eval |
| **3** | Gmail/Calendar via Nango | Deferred |
| **4** | OpenClaw POC | Optional / exploratory |

## Related

- [LibreChat + MCP lab plan](./LIBRECHAT-MCP-LAB.md)
- [Integrations overview](./README.md)
