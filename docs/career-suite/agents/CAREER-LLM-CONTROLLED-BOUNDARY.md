# Career LLM controlled execution boundary

> Camada de geração por LLM estritamente subordinada ao Career Chat Adapter, Career Agent
> Orchestrator, Career Agent Policy Engine, Career Tool Registry, Career Tool Permission
> Boundary e Human Review. O LLM apenas **produz conteúdo estruturado** dentro de um schema
> conhecido — nunca decide intent, agent, capabilities, tools, risk, approval, execution mode,
> persistência ou ações externas.

## Responsabilidades

O `CareerLlmAdapter` (`packages/career-core/src/career-llm/adapter.ts`) recebe uma task
determinística e um contexto sanitizado, monta um prompt server-owned, chama um provider
server-side, valida o structured output e retorna uma proposta client-safe. Ele **não**
executa tools, **não** retorna tool calls executáveis e **não** aceita prompt arbitrário do
cliente.

Fluxo obrigatório:

```
CareerAgentResult completed
→ resolveCareerLlmTask(agent, intent)
→ buildCareerLlmRequest()
→ evaluateCareerLlmPolicy()
→ provider adapter (mock | openai)
→ validateCareerLlmStructuredOutput()
→ CareerLlmResult
```

## Tasks permitidas

| Agent | Task |
|-------|------|
| `application_analyst` | `generate_application_fit_explanation` |
| `profile_gap_analyst` | `generate_profile_gap_explanation` |
| `interview_coach` | `generate_interview_preparation_content` |

Task adicional disponível no allowlist: `generate_review_proposal_copy`. Qualquer task
desconhecida resolve para `unsupported_llm_task`. O cliente **nunca** envia a task; ela é
derivada server-side do agent selecionado pelo orchestrator.

## Provider interface

```ts
interface CareerLlmProviderAdapter {
  readonly provider: CareerLlmProvider; // "openai" | "mock"
  generate(request: CareerLlmProviderRequest): Promise<CareerLlmProviderResponse>;
}
```

O provider adapter recebe apenas `{ task, envelope, modelAlias, temperature, maxOutputTokens,
timeoutMs }`. Ele **não** recebe tool registry, tool definitions, capabilities, approval,
execution plan completo nem provider metadata bruto.

### Mock provider

`MockCareerLlmProvider` é determinístico (mesmo input → mesmo output), sem rede, usado em CI,
testes, smoke local sem custo e como fallback controlado. Reporta `externalCall: false`.

### OpenAI provider (opcional, atrás de flag)

`OpenAiCareerLlmProvider` (`apps/applyflow/src/lib/career-llm/openai-provider.ts`) é
server-side only e usa a **Responses API** (`POST /v1/responses`) com **Structured Outputs**
estritos (`text.format.type = "json_schema"`, `strict: true`, schema espelhando exatamente
`CareerLlmStructuredOutput`). Configura explicitamente `store: false` e `stream: false`. Sem
streaming, sem function/tool calling, sem `tool_choice`, sem background mode, sem conversation
persistence. Timeout explícito (`AbortController`) e retry **limitado** (`CAREER_LLM_MAX_RETRIES`,
default 1). Configuração server-owned (`model`, `temperature`, `max output`, `timeout`, retries);
nenhum parâmetro do cliente, modelo nunca hardcoded. A API key nunca é serializada na resposta,
trace ou observabilidade. Reporta `externalCall: true`.

Mapeamento de resposta → código client-safe (sem stack trace nem payload bruto):

| Situação | Código |
|----------|--------|
| Sem API key ou modelo | `provider_not_configured` |
| 401 / 403 | `provider_auth_failed` |
| 429 | `provider_rate_limited` |
| Timeout / abort | `provider_timeout` |
| `refusal` no output | `provider_refused` |
| 5xx / falha de rede após retry | `provider_request_failed` |
| JSON inválido / vazio / não-schema | `invalid_structured_output` |
| `incomplete` por `max_output_tokens` | `output_limit_exceeded` |

**Retry** (máx. `CAREER_LLM_MAX_RETRIES`, teto 3): apenas `429`, `502`, `503`, `504` e timeout
transitório. Nunca repete `400`, `401`, `403`, refusal nem schema inválido.

## Structured output

```ts
CareerLlmStructuredOutput {
  title; summary; findings; recommendations; evidenceReferences; warnings;
}
// item: { category, text, priority, evidenceIds }
```

Limites: `summary` ≤ 1.000; `finding.text` / `recommendation.text` ≤ 500; ≤ 10 findings; ≤ 10
recommendations; ≤ 20 evidenceReferences. Sem HTML arbitrário; markdown não validado é
rejeitado pelo schema (`careerLlmStructuredOutputSchema`).

## Prompt envelope

```ts
CareerLlmPromptEnvelope { task; instructions; contextSummary; outputSchema; constraints; }
```

O envelope é server-owned. Campos como `systemPrompt`, `developerPrompt`, `hiddenPrompt`,
`customInstructions`, `promptOverride` **não** são aceitos do cliente (schema `strict` +
scanner de chaves proibidas). A mensagem do usuário entra no `contextSummary` como linha
`USER_MESSAGE_DATA:` — tratada estritamente como **dado**, nunca como instrução.

## Prompt injection boundary

A mensagem do usuário é dado, não instrução: não substitui constraints, não pede secrets, não
pede execução de tool, não altera schema. Padrões conservadores (ex.: "ignore previous
instructions", "reveal system prompt", "bypass policy", "execute tool directly") produzem o
warning estável `prompt_injection_pattern_detected` **sem bloquear** a geração — constraints e
structured output permanecem obrigatórios.

## Policy checks

`evaluateCareerLlmPolicy()` reutiliza os sinais do agent result (`safeForClient`, `hasToken`,
`rawProviderDataUsed`, `persisted`) sem duplicar o agent policy engine. Verifica: feature flag
ativa; `explicitConsent` true; provider permitido e configurado; task permitida; task compatível
com agent; agent result completed e client-safe; contexto sem chaves proibidas; input dentro
dos limites.

Códigos de bloqueio: `llm_disabled`, `explicit_consent_required`, `unsupported_llm_provider`,
`unsupported_llm_task`, `agent_task_mismatch`, `unsafe_llm_context`, `invalid_llm_input`,
`prompt_injection_pattern_detected`, `provider_not_configured`, `provider_request_failed`,
`invalid_structured_output`, `output_limit_exceeded`.

## Health / status

`GET /career-llm/health` (`apps/applyflow/src/app/career-llm/health/route.ts`) retorna apenas
status client-safe:

```json
{ "enabled": false, "provider": "mock", "configured": true, "modelAlias": "career-mock-1", "reachable": null }
```

Nunca retorna secrets, model id bruto nem URL interna. **Não** chama a API do provider em todo
request: `reachable` fica `null` por padrão. Apenas com probe explícito e controlado
(`GET /career-llm/health?probe=true`) é feita uma verificação leve, sem custo de tokens
(model lookup com timeout), retornando `reachable: true|false`. O mock é sempre `reachable: true`
(sem rede). `POST` → 405.

## Endpoint

`POST /career-llm/generate` (`apps/applyflow/src/app/career-llm/generate/route.ts`).

Body permitido:

```json
{
  "agentRequestId": "derived-local-id",
  "explicitConsent": true,
  "chatRequest": { "action": "prepare_interview", "message": "Focus on system design" },
  "context": { "careerBundle": {}, "selectedSignalIds": [] }
}
```

O cliente **não** envia provider, model, temperature, prompt, task, agent, capabilities,
execution plan ou tools. O servidor reconstrói chat normalization → intent → orchestration →
agent result → LLM task → LLM policy → provider request. `GET` → 405. JSON inválido → 400.
Resultado bloqueado → 403; erro → 500; completed → 200.

O endpoint termina em `CareerLlmResult`. Ele **não** chama `/career-tools/invoke`, nem tool
executor, nem mutação de provider, nem ação externa. Tool proposals continuam sendo produzidas
deterministicamente pelo adapter/chat existente.

## Response

```ts
CareerLlmResult {
  status; provider; task; agent; output; warnings;
  reviewRequired: true; safeForClient: true; hasToken: false; persisted: false;
  toolExecutionOccurred: false; executedExternally; externalProviderCalled; trace; observability?;
}
```

`externalProviderCalled` (e `executedExternally`) é `false` para o mock e `true` apenas quando
um provider LLM real é chamado — significa chamada externa ao provider de geração, **não**
execução de tool.

## Trace

Etapas: `llm_request_received`, `chat_request_normalized`, `agent_orchestration_completed`,
`llm_task_resolved`, `llm_policy_evaluated`, `prompt_envelope_created`, `provider_called`
(status `simulated` no mock), `structured_output_validated`, `human_review_required`. Nunca
inclui chain of thought, system prompt completo, hidden prompt, secret, token ou request/response
bruto do provider.

## UI

Painel **Career AI Draft** (`apps/applyflow/src/components/dashboard/career-ai-draft.tsx`),
integrado após o Career Chat Workspace. Mostra provider badge, task, agent, consent, loading,
structured output (findings/recommendations/evidence references), warnings, trace, manual review
badge e disclaimer. Ações: Generate draft, Regenerate draft, Copy draft, Review tool proposals,
Cancel. Não expõe: Run tools automatically, Apply recommendation, Submit application, Send
message, Save automatically, Remember conversation, Always allow.

Disclaimer: *"AI-generated content is a reviewable draft. The model cannot select tools, approve
actions, submit applications, send messages, or change career data."*

## Security

Scanner dedicado (`scanCareerLlmPayloadForForbiddenKeys`) rejeita chaves sensíveis e de controle
de prompt (tokens, secrets, `Authorization`, IDs de provider, `subject`/`body`/`description`/
`location`, `rawProviderPayload`, `systemPrompt`/`developerPrompt`/`hiddenPrompt`/`promptOverride`,
`toolRegistry`/`allowedCapabilities`/`executionPlan`, `functionCall`/`toolCall`, `command`/`url`/
`headers`/`filesystemPath`, `temperature`/`model`/`prompt`). Observabilidade client-safe expõe
apenas `provider`, `modelAlias`, `durationMs`, `externalProviderCalled`, `validationStatus`,
`retryCount`, `outputItemCount` e usage agregado (`inputUnits`/`outputUnits`). Nunca expõe API
key, raw prompt, raw response, provider request ID, authorization header ou chain of thought.

## Non-goals

- Anthropic / outros providers além de mock e OpenAI opcional
- Streaming, function calling, tool calling pelo LLM
- Persistência de conversa, histórico ou aprovações
- Auto-apply, auto-submit, envio de email/WhatsApp, mutação de aplicação/currículo/provider
- Filesystem, shell, URLs arbitrárias, execução em background

## Future providers

Novos providers entram pela `CareerLlmProviderAdapter` mantendo os mesmos limites: server-side,
structured output obrigatório, sem tool/function calling, secrets server-side only, configuração
server-owned.

## Referências

- [ADR-008](../../adr/ADR-008-CONTROLLED-LLM-EXECUTION-BOUNDARY.md)
- [ADR-007 — LibreChat adapter](../../adr/ADR-007-CAREER-LIBRECHAT-ADAPTER-BOUNDARY.md)
- [ADR-005 — Agent orchestration](../../adr/ADR-005-CAREER-AGENT-ORCHESTRATION-BOUNDARY.md)
- [ADR-006 — MCP tool permission](../../adr/ADR-006-CAREER-MCP-TOOL-PERMISSION-BOUNDARY.md)
