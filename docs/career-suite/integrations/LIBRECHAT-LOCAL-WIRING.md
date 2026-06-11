# LibreChat Local MCP Wiring

> **Lab only.** This guide documents how to test Career Suite deterministic MCP tools from a **local LibreChat setup outside this repository**. LibreChat is not required by ApplyFlow, Interview Lab, or any Career Suite MVP runtime.

## Purpose

Connect LibreChat (running separately) to the **`@devflow/career-agents-mcp`** stdio server so you can:

- List and invoke deterministic tools (`analyze_job`, `match_resume_to_job`, etc.)
- Use the LLM in LibreChat to **explain** tool output — not to replace scores
- Validate privacy boundaries before any product coupling

**`@devflow/career-agents`** remains the deterministic core. Tool handlers delegate to that package; LibreChat/LLM layers must treat JSON tool results as the source of truth.

## Prerequisites

- DevFlow monorepo cloned locally
- [pnpm](https://pnpm.io/) installed
- Node.js 18+ (matches MCP SDK requirement)
- **`@devflow/career-agents`** built
- **`@devflow/career-agents-mcp`** built
- [LibreChat](https://github.com/danny-avila/LibreChat) installed and running **outside** this repository (clone/upstream install on your machine)

## Build local tools

From the monorepo root:

```bash
pnpm --filter @devflow/career-agents build
pnpm --filter @devflow/career-agents-mcp build
```

## Start MCP server manually (smoke test)

Verify the stdio server starts before wiring LibreChat:

```bash
pnpm --filter @devflow/career-agents-mcp start:dist
```

The process listens on **stdin/stdout** (no HTTP port). Press `Ctrl+C` to stop after confirming it does not exit immediately with an error.

Development entry (TypeScript via tsx, no prior build required for the server file itself — still build `@devflow/career-agents` first):

```bash
pnpm --filter @devflow/career-agents-mcp start
```

## Example MCP stdio command

LibreChat should spawn the server as a **child process**. From the monorepo root, the built command is:

```bash
pnpm --filter @devflow/career-agents-mcp start:dist
```

Alternative after `pnpm build` inside the package (absolute paths — **keep outside the repo config you commit**):

```bash
node /path/to/devflow/packages/career-agents-mcp/dist/transport/stdio.js
```

## Candidate LibreChat MCP config

> **Example only.** Store real paths and any API keys in **your local** LibreChat config — never commit secrets or machine-specific paths to this monorepo.

LibreChat MCP server configuration shape (refer to upstream LibreChat docs for the exact file location and schema version):

```yaml
mcpServers:
  career-agents:
    command: pnpm
    args:
      - --filter
      - "@devflow/career-agents-mcp"
      - start:dist
    # cwd: /absolute/path/to/devflow   # required so pnpm --filter resolves the workspace
```

Notes:

- Set **`cwd`** to your local monorepo root so `pnpm --filter @devflow/career-agents-mcp` resolves correctly.
- Do **not** embed OpenAI or other provider keys in this block — configure LLM credentials in LibreChat’s normal settings, separately from MCP.
- This repo does **not** ship LibreChat; you maintain the LibreChat install and config locally.

## Available tools

| Tool | Role |
|------|------|
| `analyze_job` | Job description → seniority, skills, risk/domain signals |
| `analyze_resume` | Structured resume → skills, evidence levels |
| `match_resume_to_job` | Full match → `score`, `scoreBreakdown`, `gapSeverity` |
| `explain_gap_severity` | Deterministic text grouping of gaps (no LLM inside the tool) |

## Recommended test prompts

Use prompts that **request tools explicitly** and respect deterministic output:

```txt
Use the analyze_job tool to analyze this role:

[paste job title + description]
```

```txt
Use match_resume_to_job with this job description and this resume:

Job: ...
Resume: ...
```

```txt
After match_resume_to_job, use explain_gap_severity on the match result.
Then summarize the high-severity gaps in plain language without changing the score.
```

```txt
Explain the high-severity gaps without changing the deterministic score.
```

## Data boundaries

- **Do not paste secrets** (API keys, tokens, passwords) into chat or tool args.
- **Do not pass CareerBundle via URL** — paste JSON in chat or use local files; never query-string bundles.
- **Do not enable auto-submit flows** — no applying to jobs, sending email, or LinkedIn automation from this lab.
- **Do not persist candidate data remotely** for the MVP lab — treat sessions as ephemeral unless you explicitly opt into LibreChat’s own storage upstream.
- **Keep AI optional** — tools run without LLM; LibreChat LLM is for explanation only.
- **Deterministic tool output is the source of truth** — if the LLM narrative disagrees with `score` or `gapSeverity`, trust the tool JSON.

## Validation checklist

- [ ] LibreChat lists the four MCP tools after connecting to `career-agents`
- [ ] `analyze_job` returns seniority and skills for a sample posting
- [ ] `analyze_resume` returns normalized skills / evidence fields
- [ ] `match_resume_to_job` returns `score` and `gapSeverity`
- [ ] `explain_gap_severity` returns grouped high/medium/low items without calling an LLM
- [ ] LLM explanation in chat does **not** alter the deterministic `score` in tool output
- [ ] ApplyFlow and Interview Lab work with **no** LibreChat dependency
- [ ] No CareerBundle appears in browser URLs during the test

## Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| MCP server exits immediately | Run `pnpm --filter @devflow/career-agents-mcp build` first; ensure `@devflow/career-agents` is built |
| `pnpm --filter` fails from LibreChat | Set `cwd` to monorepo root in MCP config |
| Tools empty in LibreChat | Confirm stdio command path and that the child process stays alive |
| Scores differ from Interview Lab | Same inputs should match — compare raw JSON; LLM paraphrase is not the score |

## Related

- [LibreChat + MCP lab plan](./LIBRECHAT-MCP-LAB.md)
- [Integrations overview](./README.md)
- [MCP server candidates](./MCP-SERVER-CANDIDATES.md)
- [`@devflow/career-agents-mcp` README](../../../packages/career-agents-mcp/README.md)
