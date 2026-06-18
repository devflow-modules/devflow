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
| `resume_analyst` | Deterministic resume structure analysis, clarity, evidence gaps, vague bullets, impact and reordering suggestions, exaggeration risks. See [RESUME-AGENT.md](./RESUME-AGENT.md). |
| `ats_analyst` | Deterministic ATS compatibility: keyword match, requirement coverage, parsing/structure risks, keyword-stuffing warnings, bounded 0–100 score. See [ATS-AGENT.md](./ATS-AGENT.md). |
| `career_strategy_advisor` | Deterministic positioning, priority roles, skill priorities, portfolio, application strategy, 30/60/90-day plan, risks. See [CAREER-STRATEGY-AGENT.md](./CAREER-STRATEGY-AGENT.md). |

## Intents

| Intent | Routed agent | Conceptual task |
|--------|----------------|-----------------|
| `analyze_application_fit` | `application_analyst` | — |
| `analyze_profile_gaps` | `profile_gap_analyst` | — |
| `prepare_interview` | `interview_coach` | — |
| `analyze_resume` | `resume_analyst` | `analyze_resume_structure` |
| `analyze_ats_compatibility` | `ats_analyst` | `calculate_ats_compatibility` |
| `plan_career_strategy` | `career_strategy_advisor` | `build_career_strategy_plan` |

Routing is exclusively deterministic and server-owned. The client never chooses the agent, task, model, tool, capability, execution plan, or approval. A client-sent `requestedAgent` is only honored if it matches the deterministic route for the intent, otherwise the request is blocked with `agent_intent_mismatch`.

## Specialist analysis input

The three specialist intents read an optional, sanitized `context.analysisInput` (strict schema, no unknown keys):

- `resumeSnapshot` (`summary?`, `skills[]`, `experiences[]` with `title`/`company`/`bullets[]`, `projects?`, `education?`)
- `jobSnapshot` (`title`, `requiredRequirements[]`, `preferredRequirements?`, `keywords?`, `roleSummary?`)
- `targetRole`, `targetSeniority`, `targetStack[]`, `targetRoles[]`, `availability`, `constraints[]`

`analysisInput` never accepts arbitrary files, URLs, HTML, scripts, commands, filesystem paths, provider tokens, raw email, or any agent/task/model/tool/capability/approval selector. A dedicated scanner (`scanCareerAnalysisInputForForbiddenKeys`) rejects forbidden control/secret keys in addition to the strict schema.

## Capabilities (allowlist)

- `read_career_bundle`
- `read_selected_signals`
- `derive_fit_summary`
- `derive_gap_analysis`
- `derive_interview_plan`
- `derive_resume_analysis`
- `derive_ats_analysis`
- `derive_career_strategy`
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

## Non-executable review proposals

The specialist agents attach a server-derived, non-executable `reviewProposal` to the result:

| Agent | Proposal tool | Export tool |
|-------|---------------|-------------|
| `resume_analyst` | `career.prepare_resume_review` | `career.export_review_payload` |
| `ats_analyst` | `career.prepare_ats_review` | `career.export_review_payload` |
| `career_strategy_advisor` | `career.prepare_strategy_review` | `career.export_review_payload` |

These proposal tool names are intentionally **not** part of the executable career tool registry (`CAREER_AGENT_PROPOSAL_TOOLS`). They can never be invoked via `/career-tools/invoke`, carry only sanitized server-derived arguments, always require human review (`executed: false`), and produce no mutation. No new automation is added.

## Controlled LLM (optional)

Optional, server-owned LLM tasks may explain/organize deterministic results only:

| Intent | LLM task |
|--------|----------|
| `analyze_resume` | `generate_resume_improvement_explanation` |
| `analyze_ats_compatibility` | `generate_ats_compatibility_explanation` |
| `plan_career_strategy` | `generate_career_strategy_explanation` |

The LLM never computes scores, adds skills/metrics/experience, decides agent/tool, executes actions, persists content, or mutates the CareerBundle. `store:false`, `stream:false`, strict structured output, `reviewRequired:true`, `toolExecutionOccurred:false`, `persisted:false` always hold.

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
