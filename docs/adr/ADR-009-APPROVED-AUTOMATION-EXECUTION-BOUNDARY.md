# ADR-009: Approved automation execution boundary

## Status

Accepted

## Context

PR #114 introduziu orquestração determinística de agentes. PR #115 adicionou o tool permission
boundary MCP-compatible. PR #116 adicionou o adapter LibreChat-compatible. PR #117 adicionou a
camada de geração por LLM controlada. O próximo passo do roadmap exige uma camada de **automações
explicitamente aprovadas**, subordinada a todas essas camadas, capaz de executar **uma única**
ação permitida, não destrutiva e auditável — sem autonomia irrestrita, sem execução silenciosa e
sem agendamento recorrente.

Requisitos:

- `deny by default`, `allowlist only`, `explicit approval`, `single-purpose execution`
- `server-authoritative policy`, `least privilege`, `human-in-the-loop`, `auditable trace`
- `client-safe output`, `revocable intent`, `no silent persistence`
- Proibido: `auto-apply`, `auto-submit`, `send email/whatsapp`, `modify resume/application`,
  `provider mutation`, `filesystem`, `shell`, `arbitrary network`, `background execution`,
  `permanent/remembered approval`, `unbounded retries`, `self-scheduling loops`

## Decision

Adicionar o módulo `career-automation` em `@devflow/career-core` e o boundary ApplyFlow:

1. **Contratos** — `CareerAutomationProvider`, `CareerAutomationKind`, `CareerAutomationProposal`,
   `CareerAutomationRequest`, `CareerAutomationContext`, `CareerAutomationApproval`,
   `CareerAutomationPolicyDecision`, `CareerAutomationExecutionPlan`,
   `CareerAutomationExecutionResult`, `CareerAutomationTrace`, `CareerAutomationWarning`,
   `CareerAutomationAdapter` em `packages/career-core/src/career-automation/`.
2. **Kinds** — allowlist fixa não destrutiva: `prepare_application_review`,
   `prepare_profile_gap_review`, `prepare_interview_plan`, `prepare_review_export`. Mapeamento
   server-authoritative `kind → tool` (`career.derive_fit_summary`, `career.derive_gap_analysis`,
   `career.derive_interview_plan`, `career.export_review_payload`). Unknown →
   `unsupported_automation_kind`.
3. **Proposal** — `resolveCareerAutomationProposal` é server-derived, client-safe, non-executable,
   in-memory e review-required. O cliente nunca define tool, capability, risk ou execution mode.
4. **Approval** — `CareerAutomationApproval` request-scoped (`single_execution` | `single_request`).
   Sem `session`/`workspace`/`always`/`permanent`/`remembered`. Não persistida, não reutilizada,
   não transferível entre proposals.
5. **Policy** — `evaluateCareerAutomationPolicy` reutiliza `evaluateCareerToolPermission`,
   `CareerAgentExecutionPlan`, `CareerToolDefinition`/`CareerToolApproval`. Sem duplicar o tool
   permission engine.
6. **Execution** — `executeCareerAutomation` reconstrói plan/proposal/approval, valida policy e
   delega ao adapter, que reutiliza `invokeCareerTool` (local pure). Sem provider mutation, rede
   externa, filesystem, shell, background job ou scheduler.
7. **Providers** — interface `CareerAutomationAdapter`; `MockCareerAutomationAdapter`
   (determinístico, no core, sem rede); OpenClaw opcional (app layer, server-side only,
   feature-flagged, timeout explícito, single execution, sem retry/scheduler/streaming/callback).
8. **Endpoint** — `POST /career-automation/execute`; `GET` → 405; flags
   `CAREER_AUTOMATION_ENABLED` (default off) e `CAREER_AUTOMATION_PROVIDER` (default `mock`).
9. **UI** — painel `Approved Automation Review` com proposal, approval `Approve once`,
   `Run approved automation`, `Cancel`, `Copy result`, `Review output`, trace, review badge,
   disclaimer; sem ações proibidas; idempotência local (`automation_already_running`).

O adapter real (OpenClaw) fica no app layer para manter o core puro: o boundary test do core
proíbe `fetch`/fs/storage/stream/timers/SDK externo, mas **permite** o reuso server-side de
`invokeCareerTool` após policy e approval.

## Consequences

### Positive

- Autoridade única de orquestração, tool permission e approval preservada; automação nunca escolhe
  tools arbitrárias nem executa ações destrutivas/silenciosas
- Mock determinístico permite CI e smoke sem custo nem rede
- Approval request-scoped e nunca persistida; resultado sempre exige revisão humana

### Negative

- UI adiciona mais uma afordância de review junto ao Career Chat / AI Draft
- Resultado existe apenas em memória de sessão React (sem histórico)

### Deferred

- ~~Integração externa real OpenClaw~~ — entregue no rollout abaixo (single execution, sem rede no core)
- Qualquer forma de scheduling/recorrência/background processing (`scheduling deferred`)
- Persistência de proposal/approval/resultado

## Production rollout (controlled OpenClaw single-execution adapter)

PR #122 implementa o provider externo `openclaw` previsto acima, mantendo o core puro e todas as
camadas server-authoritative.

1. **App-layer adapter** — `createOpenClawCareerAutomationAdapter` em
   `apps/applyflow/src/lib/career-automation/openclaw-provider.ts` faz transporte HTTP real
   (`POST <baseUrl>/v1/executions`) com `fetch` server-side e `AbortController`. O core
   (`career-automation`) continua sem SDK, sem rede, sem timers, sem fs (boundary test mantido).
2. **Flow inalterado** — `automation request → server reconstructs proposal → policy validation →
   explicit approval validation → fixed allowlisted tool → OpenClaw transport → structured result
   validation → human review`. OpenClaw nunca escolhe kind, tool, capability, arguments, risk,
   approval, retry, schedule ou next action.
3. **Configuração** — `CAREER_AUTOMATION_ENABLED=false`, `CAREER_AUTOMATION_PROVIDER=mock`,
   `OPENCLAW_ENABLED=false`, `OPENCLAW_BASE_URL=`, `OPENCLAW_API_KEY=`, `OPENCLAW_TIMEOUT_MS=10000`.
   Default off; mock continua padrão; secrets server-side; sem fallback silencioso `openclaw → mock`
   (provider permanece openclaw e bloqueia com código OpenClaw client-safe).
4. **Envelope** — somente `requestId`, `proposalId`, `automationKind`, `approvedTool`,
   `approvedCapability`, `sanitizedInput`, `executionMode: single_execution`, `reviewRequired: true`.
   Tokens, execution plan completo, tool registry, raw provider data, callbacks/webhooks, filesystem,
   shell, URLs arbitrárias, conversation history e memória persistente nunca são enviados.
5. **Mappings fixos** — `prepare_application_review → career.derive_fit_summary`,
   `prepare_profile_gap_review → career.derive_gap_analysis`,
   `prepare_interview_plan → career.derive_interview_plan`,
   `prepare_review_export → career.export_review_payload`. Uma request → uma tool → uma execução.
6. **Auth/timeout/retry** — `Authorization: Bearer <OPENCLAW_API_KEY>` server-side (browser nunca
   envia API key). Timeout explícito; `retryCount` máximo 0 (sem retry; nova tentativa exige nova
   approval).
7. **Validação da resposta** — aceita apenas structured JSON (`status`, `proposalId`,
   `automationKind`, `toolName`, `result`, `warnings`, `durationMs`); valida correspondência de
   `proposalId`/`automationKind`/`toolName`, exige resultado client-safe e rejeita `nextAction`,
   `toolCalls`, `commands`, `filesystem`, `schedule`, `background`, `callback`, `webhook`, `memory`,
   `session`.
8. **Erros client-safe** — `openclaw_disabled`, `openclaw_not_configured`, `openclaw_auth_failed`,
   `openclaw_timeout`, `openclaw_unreachable`, `openclaw_request_failed`, `openclaw_response_invalid`,
   `openclaw_proposal_mismatch`, `openclaw_tool_mismatch`, `openclaw_unsafe_response`. Sem raw
   response, stack trace ou secret.
9. **Observability** — `provider`, `durationMs`, `validationStatus`, `externalProviderCalled`,
   `retryCount`, `automationKind`, `toolName`. Nunca API key, base URL, raw request/response,
   provider request ID ou internal session ID.
10. **Health** — `GET /career-automation/health` retorna `{ enabled, provider, configured,
    reachable, timeoutMs }` (client-safe; `reachable` apenas em probe explícito `?probe=true`);
    `POST` → 405.
11. **Endpoint principal** — `POST /career-automation/execute` mantido; sem novo endpoint de
    execução. Flags `executedExternally: true` significa apenas que o adapter OpenClaw foi chamado;
    `persisted/scheduled/backgroundExecution` permanecem `false` e `reviewRequired/safeForClient`
    permanecem `true`.

## References

- [CAREER-AUTOMATION-APPROVAL-BOUNDARY.md](../career-suite/agents/CAREER-AUTOMATION-APPROVAL-BOUNDARY.md)
- [ADR-005](./ADR-005-CAREER-AGENT-ORCHESTRATION-BOUNDARY.md)
- [ADR-006](./ADR-006-CAREER-MCP-TOOL-PERMISSION-BOUNDARY.md)
- [ADR-007](./ADR-007-CAREER-LIBRECHAT-ADAPTER-BOUNDARY.md)
- [ADR-008](./ADR-008-CONTROLLED-LLM-EXECUTION-BOUNDARY.md)
