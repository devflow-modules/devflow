# ADR-005: Career agent orchestration boundary

## Status

Accepted

## Context

The Career Suite needs a multi-agent layer for structured review proposals across ApplyFlow and Interview Lab. Provider-derived signals (PR #112–#113) and CareerBundle export/handoff contracts already exist. A parallel agent stack would duplicate policy, review, and safety semantics.

Requirements for the foundation:

- Deterministic routing and pure simulated execution (no LLM in v1)
- Server-authoritative orchestration endpoint
- Mandatory human review on every result
- Allowlisted capabilities only
- No provider calls, persistence, or automatic mutations

## Decision

Introduce `@devflow/career-core` career agent contracts and a pure orchestrator:

1. **Contracts** — `CareerAgentRequest`, `CareerAgentContext`, `CareerAgentExecutionPlan`, `CareerAgentResult`, `CareerAgentTrace`
2. **Policy engine** — deterministic consent/context/capability checks with stable block codes
3. **Routing** — intent → agent map (no LLM selection)
4. **Agents** — pure functions for `application_analyst`, `profile_gap_analyst`, `interview_coach`
5. **ApplyFlow boundary** — `POST /career-agents/orchestrate` returns client-safe JSON only; `GET` → 405
6. **UI** — `Career Agent Workspace` with consent, trace, structured output, Manual review badge

`career_orchestrator` coordinates validation/planning only; it does not emit end-user advice.

## Consequences

### Positive

- Reuses CareerBundle and selected provider signal review flow
- Clear separation between proposal generation and human action
- Auditable execution trace without private reasoning
- Extensible toward LibreChat/MCP without weakening allowlists

### Negative

- No natural-language coaching quality until a future LLM adapter
- Duplicate orchestration path (client UI + server endpoint) for authoritative validation

### Deferred

- LLM-backed agents
- LibreChat/MCP/OpenClaw bridges
- Automatic Interview Lab import of agent proposals
- Persistent agent sessions

## References

- [CAREER-AGENT-ORCHESTRATION.md](../career-suite/agents/CAREER-AGENT-ORCHESTRATION.md)
- [ADR-002](./ADR-002-ENRICHMENT-PROPOSAL-EXPORT-ONLY.md)
- [ADR-003](./ADR-003-PROVIDER-DERIVED-ENRICHMENT-APPLICATION-DEFERRED.md)
