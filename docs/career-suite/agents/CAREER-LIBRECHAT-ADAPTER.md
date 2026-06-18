# Career LibreChat adapter boundary

Structured chat adapter between LibreChat-compatible payloads and the Career Suite orchestrator — without real LibreChat transport, LLM calls, or automatic tool execution.

## Adapter responsibilities

`LibreChatAdapter` (implemented as `runLibreChatCareerAdapter` in `@devflow/career-core`):

1. Validate request (strict Zod + forbidden-key scan)
2. Normalize message (trim, length limit, role, provider)
3. Map supported intent deterministically from `action`
4. Build `CareerAgentOrchestrationBody` server-side
5. Call `orchestrateCareerAgents`
6. Resolve tool proposals (no execution)
7. Return client-safe `CareerChatResponse`
8. Require human review before any tool invoke

LibreChat **cannot**:

- Execute tools directly
- Select capabilities or register tools
- Alter risk level or forge approval
- Send execution plans or bypass policy engine
- Persist approval or conversations
- Execute external actions

## Request schema

Endpoint body (`POST /career-chat/librechat`):

```json
{
  "action": "prepare_interview",
  "message": "Focus on frontend architecture",
  "explicitConsent": true,
  "context": {
    "careerBundle": {},
    "selectedSignalIds": []
  }
}
```

Optional: `conversationId` (derived deterministically when omitted).

Rejected fields include: system/developer/hidden prompts, tool registry, capabilities, execution plan, approval scope, tokens, secrets, raw provider payloads, URLs, headers, commands, filesystem paths.

## Intent mapping

Deterministic mapping from `action` (no LLM inference):

| Action | Intent |
|--------|--------|
| `analyze_application_fit` | `analyze_application_fit` |
| `analyze_profile_gaps` | `analyze_profile_gaps` |
| `prepare_interview` | `prepare_interview` |

Invalid or missing action → `unsupported_chat_intent` / blocked response.

## Orchestration flow

```
CareerChatRequest
  → normalizeCareerChatRequest()
  → CareerAgentOrchestrationBody
  → orchestrateCareerAgents()
  → CareerAgentResult
  → resolveCareerChatToolProposals()
  → CareerChatResponse
```

Clients never send `requestedAgent`, `allowedCapabilities`, `executionPlan`, or `trace`.

## Tool proposal flow

Proposals expose registry metadata only:

- `toolName`, `description`, `requiredCapability`, `riskLevel`
- `requiresExplicitApproval`, `inputPreview`, `status`

Allowed statuses: `proposed`, `approval_required`, `ready_for_review`, `blocked`.

Never `executed` from this adapter — execution requires `POST /career-tools/invoke`.

## Approval boundary

```
chat response → tool proposal → user review → explicit approval → /career-tools/invoke
```

Scopes: `single_execution`, `single_request` only. No persistent or session-wide approval.

## Security

- Dedicated payload scanner (`scanCareerChatPayloadForForbiddenKeys`)
- Always: `reviewRequired: true`, `safeForClient: true`, `hasToken: false`, `persisted: false`, `executedExternally: false`
- Feature flag: `LIBRECHAT_ADAPTER_ENABLED` (default `false`)

## Feature flag

When disabled:

```json
{
  "status": "blocked",
  "warnings": [{ "code": "librechat_adapter_disabled" }]
}
```

## Non-goals (this PR)

- Real LibreChat transport, auth, deployment, webhooks
- Streaming (SSE / WebSocket / ReadableStream) — **deferred**
- Conversation persistence (DB, localStorage, sessionStorage, server cache)
- External LLM or provider calls
- Automatic tool execution

## Future

- Real LibreChat transport behind the same adapter contracts
- Streaming responses after orchestration boundary is stable
- Additional chat providers via `CareerChatProvider` extension

## References

- [ADR-007](../../adr/ADR-007-CAREER-LIBRECHAT-ADAPTER-BOUNDARY.md)
- [ADR-005 — Career agent orchestration](../../adr/ADR-005-CAREER-AGENT-ORCHESTRATION-BOUNDARY.md)
- [ADR-006 — MCP tool permission boundary](../../adr/ADR-006-CAREER-MCP-TOOL-PERMISSION-BOUNDARY.md)
