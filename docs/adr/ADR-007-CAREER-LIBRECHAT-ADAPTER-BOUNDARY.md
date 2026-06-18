# ADR-007: Career LibreChat adapter boundary

## Status

Accepted

## Context

PR #114 introduced deterministic career agent orchestration. PR #115 added MCP-compatible tool permission boundaries. LibreChat integration must not become a second policy engine or bypass human review.

Requirements:

- Chat messages converted to structured agent requests
- Deterministic intent mapping (no LLM inference in foundation PR)
- Reuse orchestrator, tool registry, and permission engine
- Client-safe JSON only; no tool auto-execution
- Feature-flagged endpoint; no conversation persistence

## Decision

Add `@devflow/career-core` `career-chat` module and ApplyFlow boundary:

1. **Contracts** — `CareerChatRequest`, `CareerChatResponse`, `CareerChatToolProposal`, trace types under `packages/career-core/src/career-chat/`
2. **Adapter** — `runLibreChatCareerAdapter` normalizes input, builds orchestration body, returns proposals only
3. **Intent** — explicit `action` field maps to PR #114 intents; invalid → `unsupported_chat_intent`
4. **Endpoint** — `POST /career-chat/librechat`; `GET` → 405; flag `LIBRECHAT_ADAPTER_ENABLED` (default off)
5. **UI** — `Career Chat Workspace` with consent, character counter, proposals, review badge, trace
6. **Compatibility helpers** — `parseLibreChatCompatibleRequest` / `formatLibreChatCompatibleResponse` without SDK coupling

LibreChat transport, auth, streaming, and webhooks are explicitly out of scope.

## Consequences

### Positive

- Single orchestration authority preserved
- Chat layer cannot execute tools or mutate provider state
- Extensible provider contract without implementing additional providers now

### Negative

- UI duplicates review affordances alongside Career Agent Workspace
- Conversation state exists only in React session memory

### Deferred

- Real LibreChat deployment integration
- Streaming responses
- Persistent chat history

## References

- [CAREER-LIBRECHAT-ADAPTER.md](../career-suite/agents/CAREER-LIBRECHAT-ADAPTER.md)
- [ADR-005](./ADR-005-CAREER-AGENT-ORCHESTRATION-BOUNDARY.md)
- [ADR-006](./ADR-006-CAREER-MCP-TOOL-PERMISSION-BOUNDARY.md)
