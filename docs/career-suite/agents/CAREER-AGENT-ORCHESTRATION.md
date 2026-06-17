# Career agent orchestration

Deterministic, policy-gated foundation for multi-agent career workflows in the Career Suite.

## Goals

- Typed request → policy evaluation → deterministic agent selection → structured simulated execution → client-safe result → mandatory human review.
- No LLM, LibreChat, MCP, OpenClaw, provider calls, persistence, or automatic mutations in this foundation PR.

## Agents

| Agent | Role |
|-------|------|
| `career_orchestrator` | Validates input, evaluates policies, selects agent, records rationale, produces execution plan. Does not emit final advice. |
| `application_analyst` | Fit summary, gaps, evidence, pending questions, next-step proposals from sanitized CareerBundle + selected signals. |
| `profile_gap_analyst` | Skill, evidence, and portfolio gaps with learning suggestions. |
| `interview_coach` | Study categories, STAR prompts, mock interview plan, Interview Lab handoff preview. |

## Intents

| Intent | Routed agent |
|--------|----------------|
| `analyze_application_fit` | `application_analyst` |
| `analyze_profile_gaps` | `profile_gap_analyst` |
| `prepare_interview` | `interview_coach` |

## Capabilities (allowlist)

- `read_career_bundle`
- `read_selected_signals`
- `derive_fit_summary`
- `derive_gap_analysis`
- `derive_interview_plan`
- `create_review_proposal`

Forbidden capabilities are never assigned:

- `submit_application`, `send_email`, `send_whatsapp`, `modify_application`, `modify_resume`, `persist_provider_data`, `access_provider_token`, `execute_external_tool`

## Policy engine

Deterministic checks:

- `explicitConsent === true`
- sanitized `CareerBundle` with applications
- `rawProviderData === false`
- `hasToken === false`
- `selectedSignalIds` must exist in available signal context when provided
- capabilities resolved server-side from agent allowlist

Stable block codes:

- `explicit_consent_required`
- `unsafe_context`
- `raw_provider_data_not_allowed`
- `provider_token_not_allowed`
- `unsupported_agent`
- `unsupported_intent`
- `capability_not_allowed`
- `missing_required_input`
- `agent_intent_mismatch`

## Execution trace

Client-safe steps only:

1. `request_validated`
2. `policy_evaluated`
3. `agent_selected`
4. `capabilities_resolved`
5. `execution_completed`
6. `review_required`

No chain-of-thought, prompts, secrets, tokens, provider IDs, or raw provider input.

## Security

All results must expose:

```txt
reviewRequired: true
safeForClient: true
hasToken: false
rawProviderDataUsed: false
persisted: false
```

## Signal integration

- Only user-selected `selectedSignalIds` from the provider review flow are passed into agent context.
- If none are selected, orchestration may continue with CareerBundle only and emits `no_provider_signals_selected`.

## Handoff preview

`prepare_interview` may emit an in-memory `interviewPreparationProposal` preview (copyable/exportable, review-required). No automatic Interview Lab import (ADR-002 unchanged).

## Non-goals (this PR)

- Real LLM execution
- LibreChat / MCP / OpenClaw integration
- Provider runtime calls
- Automatic apply/submit/send/save
- ADR-002 enrichment import

## Roadmap

- External agent runtime adapters behind the same policy boundary
- Optional LibreChat/MCP bridge with server-authoritative capability grants
- Human-reviewed proposal export extensions
