# Career Automation — Approved automation execution boundary

Camada de automações explicitamente aprovadas da Career Suite. É **subordinada** ao Career Agent
Orchestrator, Career Tool Registry, Career Tool Permission Engine, Career Chat Adapter, Controlled
LLM Boundary e Human Approval. Executa **uma única** ação permitida, não destrutiva e auditável.

Princípios: `deny by default`, `allowlist only`, `explicit approval`, `single-purpose execution`,
`server-authoritative policy`, `least privilege`, `human-in-the-loop`, `auditable trace`,
`client-safe output`, `revocable intent`, `no silent persistence`.

## Automation taxonomy

Kinds permitidos (não destrutivos) e mapeamento fixo `kind → tool`:

| Kind                          | Tool                          | Capability             | Approval | Risk   |
| ----------------------------- | ----------------------------- | ---------------------- | -------- | ------ |
| `prepare_application_review`  | `career.derive_fit_summary`   | `derive_fit_summary`   | once     | derive |
| `prepare_profile_gap_review`  | `career.derive_gap_analysis`  | `derive_gap_analysis`  | once     | derive |
| `prepare_interview_plan`      | `career.derive_interview_plan`| `derive_interview_plan`| once     | derive |
| `prepare_review_export`       | `career.export_review_payload`| `create_review_proposal`| explicit | export |

Proibido (nunca registrado; resolve para `unsupported_automation_kind`): `submit_application`,
`send_email`, `send_whatsapp`, `modify_application`, `modify_resume`, `persist_provider_data`,
`execute_shell`, `write_filesystem`, `fetch_url`.

## Proposal lifecycle

`resolveCareerAutomationProposal({ kind, agentRequestId, context })` produz uma proposal
**server-derived**, **client-safe**, **non-executable**, **in-memory** e **review-required**:

```
proposalId, kind, title, description, requestedTool, requiredCapability,
riskLevel, requiresExplicitApproval, inputPreview, reviewRequired
```

O cliente nunca define `requestedTool`, `requiredCapability`, `riskLevel` ou `executionMode`.

## Approval lifecycle

`CareerAutomationApproval` é request-scoped:

```
proposalId, approved, approvedAt, approvalScope ∈ { single_execution, single_request }
```

Proibido: `session`, `workspace`, `always`, `permanent`, `remembered`. A approval não é persistida,
não é reutilizada e não é transferível entre proposals. Após cada conclusão, uma nova execução
exige nova approval.

## Policy

`evaluateCareerAutomationPolicy` reutiliza `evaluateCareerToolPermission`,
`CareerAgentExecutionPlan`, `CareerToolDefinition`, `CareerToolApproval`. Checks: feature flag,
proposal válida, kind suportada, tool registrada, capability permitida no plan, approval válida,
approval ↔ proposal, approval ↔ tool, contexto client-safe, provider permitido, execução não
destrutiva, execution plan disponível.

Códigos: `automation_disabled`, `unsupported_automation_provider`, `unsupported_automation_kind`,
`automation_not_allowed`, `automation_tool_not_allowed`, `automation_capability_not_allowed`,
`explicit_approval_required`, `approval_proposal_mismatch`, `approval_tool_mismatch`,
`unsafe_automation_context`, `execution_plan_not_available`, `automation_execution_failed`,
`automation_result_invalid`.

## Execution lifecycle / tool reuse

`executeCareerAutomation`:

```
proposal → policy → tool permission boundary → local pure execution → automation result
```

O executor **não duplica** a execução de tools: o adapter reutiliza `invokeCareerTool` /
`executeCareerToolPure`, mas somente após policy e approval válidas. Nunca executa provider
mutation, rede externa, filesystem, shell, background job ou scheduler.

Result (flags sempre): `reviewRequired: true`, `safeForClient: true`, `hasToken: false`,
`persisted: false`, `backgroundExecution: false`, `scheduled: false`. `executedExternally` é
`false` para mock/local e só seria `true` para um adapter externo real.

Trace permitido: `automation_request_received`, `proposal_resolved`, `execution_plan_resolved`,
`automation_policy_evaluated`, `approval_validated`, `tool_permission_validated`,
`automation_execution_started`, `automation_execution_completed`, `human_review_required`. Nunca
inclui chain of thought, hidden prompt, secret, token, raw provider payload, raw tool input ou
stack trace.

## Endpoint

`POST /career-automation/execute` (server-side only). O servidor reconstrói agent execution plan,
proposal, tool definition, capability mapping, approval, automation policy e tool invocation.
`GET` → 405. Status: `200` completed, `400` invalid_json, `403` blocked, `500` client-safe failure.

Body público:

```json
{
  "agentRequestId": "derived-local-id",
  "proposalId": "derived-proposal-id",
  "kind": "prepare_interview_plan",
  "explicitApproval": true,
  "approvalScope": "single_execution",
  "context": { "careerBundle": {}, "selectedSignalIds": [] }
}
```

O cliente nunca envia tool, capability, risk, execution mode, provider secret, endpoint, URL,
headers, command, filesystem path, approval permanente, retry policy, schedule, cron ou background.

## Idempotency

Para prevenir duplo clique: a mesma proposal + mesma approval com execução em andamento bloqueia a
segunda execução (`automation_already_running`, guard local na UI). Após conclusão, nova execução
exige nova approval. Nenhuma idempotency key é persistida.

## Security

Scanner dedicado (`scanCareerAutomationPayloadForForbiddenKeys`) rejeita, além dos campos do
career-agent scanner: `command`, `url`, `headers`, `filesystemPath`, `cron`, `schedule`,
`retryPolicy`, `background`, `callbackUrl`, `webhookUrl`, `rawProviderPayload`, `systemPrompt`,
`developerPrompt`, `hiddenPrompt`, `toolRegistry`, `allowedCapabilities`, `executionPlan` enviado
pelo cliente.

## UI

Painel `Approved Automation Review` (após `Career AI Draft`): automation kind, proposal title,
description, tool, capability, risk, input summary, approval required, provider, execution status,
trace e badge `Manual review`. Ações permitidas: `Approve once`, `Run approved automation`,
`Cancel`, `Copy result`, `Review output`. Nunca mostra: `Always allow`, `Run automatically`,
`Schedule`, `Repeat`, `Background mode`, `Remember approval`, `Execute all`, `Apply now`, `Send`,
`Submit`. `Cancel` limpa a approval local, não executa, não persiste e não registra job.

Disclaimer: _"Automations run only after policy validation and explicit approval. No application,
message, profile, provider, or external system is changed automatically."_

## Non-goals / scheduling deferred

Sem cron, queue, worker, scheduler, delayed execution, recurrence ou background processing
(`scheduling deferred`). Sem persistência de proposal/approval/resultado/job. Sem autonomia
irrestrita e sem execução silenciosa.

## OpenClaw future adapter

OpenClaw é tratado como `CareerAutomationAdapter` (server-side only, feature-flagged). Neste PR a
interface é estável e o mock determinístico é entregue; a integração externa real fica deferred. O
adapter real nunca recebe tool registry completo, capabilities completas, raw CareerBundle, raw
provider metadata ou approval persistida, e nunca abre sockets, agenda jobs, faz retry infinito,
streaming ou callbacks externos.

## References

- [ADR-009](../../adr/ADR-009-APPROVED-AUTOMATION-EXECUTION-BOUNDARY.md)
- [CAREER-LLM-CONTROLLED-BOUNDARY.md](./CAREER-LLM-CONTROLLED-BOUNDARY.md)
