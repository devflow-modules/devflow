# Career MCP tool permission boundary

Deterministic, allowlisted tool contracts compatible with MCP descriptors — without a real MCP server in this foundation PR.

## Tool taxonomy

| Tool | Capability | Risk |
|------|------------|------|
| `career.read_bundle` | `read_career_bundle` | read |
| `career.read_selected_signals` | `read_selected_signals` | read |
| `career.derive_fit_summary` | `derive_fit_summary` | derive |
| `career.derive_gap_analysis` | `derive_gap_analysis` | derive |
| `career.derive_interview_plan` | `derive_interview_plan` | derive |
| `career.create_review_proposal` | `create_review_proposal` | export |
| `career.export_review_payload` | `create_review_proposal` | export (explicit approval) |

Forbidden tool names are documented but never registered.

## Registry

- Static, immutable, server-owned (`CAREER_TOOL_REGISTRY`)
- Client cannot register tools or override `requiredCapability`, `riskLevel`, `requiresExplicitApproval`, or `executionMode`
- Unknown tool → `unsupported_tool`

## Permission evaluation

Reuses PR #114 `CareerAgentExecutionPlan` and capabilities. Checks:

1. Tool exists and is not blocked
2. Context is client-safe
3. Input passes strict Zod schema
4. Capability is on execution plan
5. Agent allowlist includes capability
6. Explicit approval when required (`export_*`)

## Approval model

```ts
{ toolName, approved: true, approvedAt, approvalScope: "single_execution" | "single_request" }
```

- Not persisted
- Not reused across requests
- Export tools require additional explicit approval

## Execution lifecycle

1. `POST /career-agents/orchestrate` → execution plan
2. Human review in UI
3. `POST /career-tools/invoke` with orchestration context (plan reconstructed deterministically)
4. Permission + local pure execution
5. Client-safe result + trace

## MCP descriptors

`listCareerMcpToolDescriptors()` returns `{ name, description, inputSchema }` for allowed tools only.

## Security

All results: `reviewRequired: true`, `safeForClient: true`, `hasToken: false`, `persisted: false`, `executedExternally: false`

## Non-goals

- Real MCP server / LibreChat / OpenClaw
- External tool execution
- Filesystem/network/provider/LLM calls
- Persistent approvals

## Future

MCP server adapter behind the same registry and permission boundary.
