# ADR-006: Career MCP tool permission boundary

## Status

Accepted

## Context

PR #114 introduced deterministic career agent orchestration with allowlisted capabilities and mandatory human review. A separate MCP/tool layer must not duplicate policy engines or introduce arbitrary execution paths.

Requirements:

- MCP-compatible tool descriptors without a real MCP server
- Static registry with server-side permission evaluation
- Reuse `CareerAgentCapability`, execution plans, and traces from PR #114
- Explicit approval for export tools; no persistence

## Decision

Add `@devflow/career-core` career-tools module:

1. **Registry** — immutable `CAREER_TOOL_REGISTRY` mapping tools to PR #114 capabilities
2. **Permission** — deterministic evaluation against reconstructed execution plans
3. **Executor** — local pure functions only; reuses agent derive helpers
4. **Invoke boundary** — `POST /career-tools/invoke`; `GET` → 405
5. **UI** — `Career Tool Permission Review` with Approve once / Cancel / Run approved tool

Clients send orchestration context + tool input; server derives capabilities, risk, and execution mode.

## Consequences

### Positive

- Single capability model across agents and tools
- MCP-ready descriptors without premature server integration
- Export tools gated by explicit per-request approval

### Negative

- Execution plan must be reconstructable from orchestration payload (no silent server memory)
- Duplicate boundary fetch path in ApplyFlow UI

### Deferred

- Real MCP server transport
- LibreChat / OpenClaw bridges
- Persistent or “always allow” approvals

## References

- [CAREER-MCP-TOOL-BOUNDARY.md](../career-suite/agents/CAREER-MCP-TOOL-BOUNDARY.md)
- [ADR-005](./ADR-005-CAREER-AGENT-ORCHESTRATION-BOUNDARY.md)
