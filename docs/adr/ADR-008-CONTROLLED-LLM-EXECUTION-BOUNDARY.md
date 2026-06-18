# ADR-008: Controlled LLM execution boundary

## Status

Accepted

## Context

PR #114 introduziu orquestração determinística de agentes. PR #115 adicionou o tool permission
boundary MCP-compatible. PR #116 adicionou o adapter LibreChat-compatible (sem LLM). O próximo
passo do roadmap exige geração por LLM **subordinada** a essas camadas, sem que o modelo se
torne um segundo policy engine, escolha tools ou execute ações.

Requisitos:

- O LLM só produz conteúdo estruturado dentro de um schema conhecido
- O servidor escolhe intent, agent, task, provider, model e monta o prompt
- Structured output validado contra schema e limites
- Human-in-the-loop preservado; resposta client-safe; consentimento explícito
- Sem tool calling, function calling, auto-apply, auto-submit, persistência ou ações externas
- Feature-flagged; secrets server-side only; mock determinístico obrigatório

## Decision

Adicionar o módulo `career-llm` em `@devflow/career-core` e o boundary ApplyFlow:

1. **Contratos** — `CareerLlmProvider`, `CareerLlmTask`, `CareerLlmRequest`, `CareerLlmContext`,
   `CareerLlmPromptEnvelope`, `CareerLlmStructuredOutput`, `CareerLlmResult`, `CareerLlmWarning`,
   `CareerLlmTrace`, `CareerLlmPolicyDecision`, `CareerLlmProviderConfig` em
   `packages/career-core/src/career-llm/`.
2. **Task mapping** — `resolveCareerLlmTask(agent, intent)` determinístico; allowlist fixa;
   unknown → `unsupported_llm_task`.
3. **Prompt envelope** — server-owned (`buildCareerLlmPromptEnvelope`); mensagem do usuário como
   dado; scanner rejeita campos de prompt-override; warning conservador
   `prompt_injection_pattern_detected` sem desligar constraints.
4. **Structured output** — `careerLlmStructuredOutputSchema` + limites
   (`validateCareerLlmStructuredOutput`).
5. **Policy** — `evaluateCareerLlmPolicy` reutiliza os sinais do agent result, sem duplicar o
   agent policy engine.
6. **Providers** — interface `CareerLlmProviderAdapter`; `MockCareerLlmProvider` (determinístico,
   no core, sem rede); `OpenAiCareerLlmProvider` opcional (server-side only, no app layer, com
   `fetch`, timeout, sem streaming/tools).
7. **Adapter** — `runCareerLlmGeneration` orquestra: normalização → orchestration → task →
   policy → envelope → provider → validação → `CareerLlmResult`.
8. **Endpoint** — `POST /career-llm/generate`; `GET` → 405; flags `CAREER_LLM_ENABLED` (default
   off) e `CAREER_LLM_PROVIDER` (default `mock`).

## Production rollout (controlled OpenAI provider)

O `OpenAiCareerLlmProvider` foi colocado em condição real de produção sem alterar a autoridade
de orquestração/policy nem o human-in-the-loop:

- **Responses API** — `POST /v1/responses` com **Structured Outputs** estritos
  (`text.format.type = "json_schema"`, `strict: true`, schema espelhando exatamente
  `CareerLlmStructuredOutput`); `store: false`, `stream: false`; sem `tools`/`tool_choice`/
  function calling; sem background mode; sem conversation persistence.
- **Configuração validada** — `CAREER_LLM_TIMEOUT_MS` (default 15000) e `CAREER_LLM_MAX_RETRIES`
  (default 1) server-owned e bounded; `openai` só é `configured` com **API key e modelo**
  presentes; modelo server-owned (sem hardcode, nunca do cliente); **sem fallback silencioso**
  de `openai` para `mock` (não configurado → bloqueado por policy).
- **Erros client-safe** — `provider_not_configured`, `provider_auth_failed`,
  `provider_rate_limited`, `provider_timeout`, `provider_refused`, `provider_request_failed`,
  `invalid_structured_output`, `output_limit_exceeded`; sem stack trace nem payload bruto.
- **Retry limitado** — apenas `429`/`502`/`503`/`504`/timeout transitório; nunca `400`/`401`/
  `403`/refusal/schema inválido.
- **Observabilidade** — `provider`, `modelAlias`, `durationMs`, `externalProviderCalled`,
  `validationStatus`, `retryCount`, `inputUnits`/`outputUnits`; nunca API key, raw prompt/response,
  provider request ID, authorization header ou chain of thought.
- **Health/status** — `GET /career-llm/health` client-safe (`enabled`, `provider`, `configured`,
  `modelAlias`, `reachable`); não chama a API em todo request — `reachable` só com probe explícito
  e controlado.
- **CI** — testes com rede mockada; API real nunca usada em CI. `mock` permanece o provider
  padrão; OpenAI é opt-in.
9. **UI** — painel `Career AI Draft` com consent, structured output, trace, review badge,
   disclaimer; sem ações proibidas.

O provider real fica no app layer para manter o core puro (boundary test proíbe `fetch`/fs/
storage/stream/tool executor em `packages/career-core/src/career-llm`).

## Consequences

### Positive

- Autoridade única de orquestração e policy preservada; LLM nunca escolhe ou executa tools
- Mock determinístico permite CI e smoke sem custo nem rede
- Provider real controlado (OpenAI) atrás de flag, com structured output obrigatório e secrets
  server-side only

### Negative

- UI duplica afordâncias de review junto ao Career Chat / Agent Workspace
- Conteúdo gerado existe apenas em memória de sessão React (sem histórico)

### Deferred

- Anthropic e outros providers
- Streaming e usage detalhado por provider
- Qualquer forma de persistência de draft/conversa

## References

- [CAREER-LLM-CONTROLLED-BOUNDARY.md](../career-suite/agents/CAREER-LLM-CONTROLLED-BOUNDARY.md)
- [ADR-005](./ADR-005-CAREER-AGENT-ORCHESTRATION-BOUNDARY.md)
- [ADR-006](./ADR-006-CAREER-MCP-TOOL-PERMISSION-BOUNDARY.md)
- [ADR-007](./ADR-007-CAREER-LIBRECHAT-ADAPTER-BOUNDARY.md)
