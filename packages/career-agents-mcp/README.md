# @devflow/career-agents-mcp

Local MCP lab scaffold for Career Suite **deterministic** agents.

**Status:** Experimental lab. **Not** required by ApplyFlow, Interview Lab, or any product runtime.

## Principles

- **Local-first** — run handlers in-process or via a future local MCP process
- **Privacy-first** — no CareerBundle in URLs; no silent remote persistence
- **Deterministic-first** — all scoring via `@devflow/career-agents`
- **No AI by default** — `explain_gap_severity` is template text only
- **No network calls** — handlers are pure functions
- **No persistence** — stateless request/response
- **No auto-submit** — tools never apply to jobs or send messages

## Tools

| Tool | Handler | Delegates to |
|------|---------|--------------|
| `analyze_job` | `handleAnalyzeJob` | `analyzeJob()` |
| `analyze_resume` | `handleAnalyzeResume` | `analyzeResume()` |
| `match_resume_to_job` | `handleMatchResumeToJob` | `analyzeJob` + `analyzeResume` + `matchJobToResume` |
| `explain_gap_severity` | `handleExplainGapSeverity` | deterministic grouping of `gapSeverity` |

Registry: `CAREER_AGENTS_MCP_TOOLS` / `invokeCareerAgentsMcpTool(name, input)`.

## Local stdio transport

Build dependencies, then start the lab server:

```bash
pnpm --filter @devflow/career-agents build
pnpm --filter @devflow/career-agents-mcp build
pnpm --filter @devflow/career-agents-mcp start
```

This starts a **local MCP stdio server** for lab usage (no network port, no persistence).

After build, you can also run the compiled bin:

```bash
pnpm --filter @devflow/career-agents-mcp start:dist
# or: pnpm exec career-agents-mcp  (when linked)
```

### Example tools exposed over stdio

- `analyze_job`
- `analyze_resume`
- `match_resume_to_job`
- `explain_gap_severity`

## MCP transport (in-process)

Handlers and Zod schemas work without stdio — useful for unit tests and Interview Lab-style adapters:

## Usage (in-process lab)

```ts
import { invokeCareerAgentsMcpTool, handleAnalyzeJob } from "@devflow/career-agents-mcp";
import { sampleJobInput as job, sampleResumeInput as resume } from "@devflow/career-agents";

const result = invokeCareerAgentsMcpTool("match_resume_to_job", { job, resume });
const explanation = invokeCareerAgentsMcpTool("explain_gap_severity", {
  match: (result as { match: unknown }).match,
});
```

Or call handlers directly:

```ts
import { handleAnalyzeJob } from "@devflow/career-agents-mcp";

handleAnalyzeJob({ title: "Engineer", description: "React, TypeScript" });
```

## Relationship with LibreChat

[LibreChat](https://github.com/danny-avila/LibreChat) may call this stdio server in a **local manual lab setup**. This package does **not** require LibreChat, does not install it, and does not include wiring instructions beyond [`docs/career-suite/integrations/LIBRECHAT-MCP-LAB.md`](../../docs/career-suite/integrations/LIBRECHAT-MCP-LAB.md).

## Scripts

```bash
pnpm --filter @devflow/career-agents-mcp build
pnpm --filter @devflow/career-agents-mcp typecheck
pnpm --filter @devflow/career-agents-mcp test
```

Build `@devflow/career-agents` first when linking from source:

```bash
pnpm --filter @devflow/career-agents build
```

## Related docs

- [`docs/career-suite/integrations/LIBRECHAT-MCP-LAB.md`](../../docs/career-suite/integrations/LIBRECHAT-MCP-LAB.md)
- [`docs/career-suite/integrations/MCP-SERVER-CANDIDATES.md`](../../docs/career-suite/integrations/MCP-SERVER-CANDIDATES.md)
