# Política de roteamento — monorepo DevFlow

**Status:** obrigatória para PRs que criam ou movem rotas.  
**Índice plataforma (apps, validação, deploy):** `docs/architecture/PLATFORM-STANDARD.md`  
**Matriz operacional:** `docs/site/MATRIZ-DECISAO-ROTAS.md`  
**Plano de execução (fases):** `docs/architecture/ROUTING_MIGRATION_EXECUCAO.md`  
**Registro em código:** `src/lib/routing-governance.ts`

---

## 1. Objetivo

Evitar que o repositório volte ao estado de **super-app na raiz** sem dono claro: toda rota pública ou operacional tem **um app dono**, uma **fase de migração** conhecida e, quando aplicável, caminho de **saída do legado**.

---

## 2. Regra crítica (gate de PR)

### Nenhuma rota nova sem dono definido

Antes de mergear código que adiciona `page.tsx`, `route.ts` ou redirect:

| Pergunta | Obrigatório |
|----------|-------------|
| **Qual app dono?** (`portal` raiz, `apps/financeiro`, `apps/whatsapp-platform`, …) | Sim |
| **Qual domínio/host em produção?** (mesmo monorepo pode ter vários deploys) | Sim, ou “ainda não definido” + issue link |
| **Já existe rota equivalente em outro app?** | Sim — se sim, justificar ou redirecionar |
| **É marketing, produto autenticado ou API de produto?** | Sim |

Se **não** der para responder → **PR não deve ser mergeado** até atualizar esta política, a matriz ou o registro `routing-governance.ts`.

**Checklist no PR:** usar template em `.github/pull_request_template.md`.

---

## 3. Separação por domínio (alvo)

| Camada | Onde deve morar | Exemplos |
|--------|-----------------|----------|
| **Marketing / aquisição / SEO** | Portal (`src/app` raiz) | `/`, `/produtos`, `/precos`, `/blog`, landings, `/demo`, legal |
| **Landing pública de produto** | Portal (narrativa + CTA + **redirect** quando o “próximo passo” é o app) | `/produtos/*`, `/ferramentas/financeiro` (capa); `/ferramentas/financeiro/demo` = **redirect** para o app canônico (sem painel na raiz) |
| **App autenticado do produto** | `apps/*` correspondente | Dashboard, settings, billing do produto, inbox WhatsApp |
| **APIs de dados do produto** | Mesmo app que consome o dado | Evitar API Financeiro “só na raiz” após cutover |

---

## 4. Proibições

1. **Duplicar** a mesma URL semântica em dois apps sem plano de **redirecionamento** e data de desligamento documentados na matriz.  
2. Colocar **lógica operacional de produto** na raiz (dashboards, billing de produto, inbox) **após** cutover — exceto **landing de aquisição** e redirects documentados na matriz (ex.: `/ferramentas/financeiro/demo` → app).  
3. Criar páginas novas em **`apps/site`** sem aprovação explícita de arquitetura (pacote em depreciação; canon = raiz).

---

## 5. Exceções documentadas (permitidas)

| Caso | Motivo |
|------|--------|
| **`/login` (e fluxos auth) em mais de um deploy** | Cada produto no seu host com mesmo path é aceitável; documentar domínio. |
| **`/demo` e demos públicas na raiz** | Aquisição; não confundir com app logado. |
| **`/ferramentas/financeiro/demo` na raiz** | **URL de aquisição** no portal; resposta canónica = **redirect** para o demo no `apps/financeiro` (tracking de CTA no clique, antes do redirect). |
| **Ferramentas gratuitas** (`/ferramentas/consulta-cnpj`, divisão de contas) | Portal; APIs públicas associadas podem ficar na raiz. |

Novas exceções: adicionar **tabela nesta seção** + linha na `MATRIZ-DECISAO-ROTAS.md` + entrada em `routing-governance.ts` se aplicável à raiz.

---

## 6. Governança técnica

- **`src/lib/routing-governance.ts`** — registro das rotas da **raiz** com `owner`, `phase`, notas de migração.  
- **`src/proxy.ts`** — em **desenvolvimento**, avisos no console para rotas em Fase 2/3 (sem alterar resposta em produção por padrão).  
- **CI (enforce):** workflow **Routing governance** (`.github/workflows/routing-governance-check.yml`) — em todo PR que alterar `src/app/**/page.tsx`, `src/app/**/route.ts` ou `apps/**/src/app/**/{page.tsx,route.ts}`, o diff precisa incluir ao menos uma mudança em `routing-governance.ts`, `MATRIZ-DECISAO-ROTAS.md` ou `ROUTING_POLICY.md`. Rode localmente: `bash scripts/ci/check-routing-governance.sh origin/main HEAD`.  
- Evolução futura (Fase 2+): redirects via `next.config` ou env (`NEXT_PUBLIC_*`) quando URLs canônicas estiverem fixas.

---

## Notas de governança

Alterações cosméticas em `page.tsx` ou `route.ts` (sem mudança de path, ownership ou contrato) ainda disparam o gate de CI; registre aqui o motivo quando o diff for apenas conformidade de design system ou lint.

- **2026-06-10** — PR #36 tocou `apps/whatsapp-platform/src/app/settings/ai/page.tsx` apenas para substituir um `<button>` nativo de submit pelo primitivo compartilhado `Button`. Alteração de conformidade com design system (`check:buttons`); não altera path da rota, ownership, navegação, fronteira de autenticação, contrato HTTP ou semântica do formulário.
- **2026-06-12** — PR #75 adiciona `GET /provider-runtime/nango/connect` em `apps/applyflow` (`route.ts`). Rota server-side de launcher Nango connect session: JSON client-safe only; blocked-by-default (feature flags + consentimento explícito); sem import Gmail/Calendar; sem sync; sem exposição de token; sem persistência de provider payload. UI principal permanece preview-only.
- **2026-06-12** — PR #77 altera a rota existente `GET /provider-runtime/nango/connect` em `apps/applyflow` para retornar readiness de Connect UI com `connectSessionToken` client-safe quando flags, secret server-side e consentimento explícito permitem. A UI de consentimento explícito chama o launcher e, em `oauth_start_ready`, abre Nango Connect UI via `@nangohq/frontend`. Path inalterado; sem import Gmail/Calendar; sem sync job; sem persistência de provider payload; sem exposição de OAuth access/refresh token; sem mutação de CareerBundle; secrets permanecem server-side.
- **2026-06-12** — PR adiciona `POST /provider-runtime/nango/connection-status` em `apps/applyflow` (`connection-status/route.ts`). Rota server-side de verificação de conexão Nango: JSON client-safe only (`ProviderConnectionVerificationResult`); blocked-by-default (feature flags + consentimento explícito); consulta `listConnections` sem credenciais via tag `end_user_id` estável; sem import Gmail/Calendar; sem sync; sem exposição de token ou connection object bruto; sem persistência de provider payload; UI com botão explícito **Verify connection**.
- **2026-06-12** — PR adiciona `POST /provider-runtime/nango/derived-preview` em `apps/applyflow` (`derived-preview/route.ts`). Rota server-side de preview read-only opt-in: JSON client-safe only (`ProviderDerivedRuntimeCompositionResult`); blocked-by-default (feature flags + consentimento explícito); verifica conexões Gmail e Calendar independentemente no servidor via `handleApplyFlowNangoConnectionVerification` (estado de conexão do client nunca é confiável para autorização); executa boundaries Gmail/Calendar e composição runtime de forma efémera; sem persistência; sem exposição de token, metadata bruto ou IDs de provider; sem mutação de CareerBundle; UI com botão explícito **Run read-only preview**.
- **2026-06-17** — PR adiciona `POST /provider-runtime/nango/disconnect` em `apps/applyflow` (`disconnect/route.ts`). Rota server-side de disconnect Nango por provider: JSON client-safe only (`ProviderConnectionDisconnectResult`); blocked-by-default (feature flags + confirmação explícita); descobre conexão via `listConnections` server-side; remove com `deleteConnection`; verifica ausência pós-delete; nunca aceita `connectionId` do cliente; sem revogação Google automática; sem import/sync/persistência; UI com confirmação **Disconnect Gmail/Calendar**.
- **2026-06-17** — PR #114 adiciona `POST /career-agents/orchestrate` em `apps/applyflow` (`orchestrate/route.ts`). Rota server-side de orquestração determinística de agentes Career Suite: JSON client-safe only (`CareerAgentResult`); requer consentimento explícito; policy engine + roteamento por intent; execução simulada pura (sem LLM, sem provider calls); capabilities allowlisted server-side; `reviewRequired: true` sempre; sem mutação de CareerBundle/candidatura; `GET` → 405.
- **2026-06-17** — PR #115 adiciona `POST /career-tools/invoke` em `apps/applyflow` (`invoke/route.ts`). Rota server-side de invocação de ferramentas Career MCP-compatible: JSON client-safe only (`CareerToolExecutionResult`); reconstrói execution plan deterministicamente a partir do contexto de orquestração; permission engine + approval explícito para export; execução local pura (sem MCP server, sem rede, sem filesystem); `reviewRequired: true` sempre; `GET` → 405.
- **2026-06-17** — PR #116 adiciona `POST /career-chat/librechat` em `apps/applyflow` (`librechat/route.ts`). Rota server-side do adapter LibreChat-compatible: JSON client-safe only (`CareerChatResponse`); normaliza mensagem + intent determinístico; chama orchestrator server-side; expõe tool proposals sem execução; requer consentimento explícito; feature flag `LIBRECHAT_ADAPTER_ENABLED` (default off); sem LLM, sem provider calls, sem persistência de conversa; `GET` → 405.
- **2026-06-18** — PR adiciona transporte HTTP real LibreChat em `apps/applyflow`: mantém `POST /career-chat/librechat` como único boundary de execução; aceita payload UI e envelope LibreChat server-authenticated; entrega somente ao boundary existente (sem novo orchestrator/policy/tools); feature flag `LIBRECHAT_TRANSPORT_ENABLED` (default off) + config server-side (`LIBRECHAT_BASE_URL`, `LIBRECHAT_API_KEY`, `LIBRECHAT_TIMEOUT_MS`); secrets nunca no cliente; sem streaming/background/retries/persistência/tool execution; adiciona `GET /career-chat/librechat/health` (status client-safe, sem secrets; `POST` → 405).
- **2026-06-17** — PR #117 adiciona `POST /career-llm/generate` em `apps/applyflow` (`career-llm/generate/route.ts`). Rota server-side da camada controlada de geração por LLM: JSON client-safe only (`CareerLlmResult`); server-side only; feature-flagged (`CAREER_LLM_ENABLED`, default off; `CAREER_LLM_PROVIDER=mock|openai`); requer consentimento explícito; structured output validado contra schema e limites; reconstrói chat normalization → orchestration → task → policy → provider server-side; o LLM não escolhe intent/agent/task/provider/tools nem executa tools; **sem execução de tools** (nenhuma chamada a `/career-tools/invoke`); sem persistência; secrets server-side only; `reviewRequired: true` sempre; `GET` → 405.
- **2026-06-17** — PR #118 adiciona `POST /career-automation/execute` em `apps/applyflow` (`career-automation/execute/route.ts`). Rota server-side da camada de automações explicitamente aprovadas: JSON client-safe only (`CareerAutomationExecutionResult`); server-side only; feature-flagged (`CAREER_AUTOMATION_ENABLED`, default off; `CAREER_AUTOMATION_PROVIDER=mock|openclaw`); approval explícita request-scoped; single execution; reconstrói execution plan → proposal → tool definition → capability → approval → policy → tool invocation server-side; allowlist server-authoritative kind→tool não destrutivo; **sem schedule, sem background, sem persistência**; reutiliza o tool engine puro server-side (sem chamada do cliente a `/career-tools/invoke`); secrets server-side only; `reviewRequired: true` sempre; `GET` → 405.
- **2026-06-18** — PR habilita o provider OpenAI controlado de produção em `apps/applyflow` (sem novo endpoint de geração): `POST /career-llm/generate` permanece o único boundary; o `OpenAiCareerLlmProvider` migra para a Responses API (`POST /v1/responses`) com Structured Outputs estritos (`json_schema`, `strict: true`, `store: false`, `stream: false`, sem tools/function calling); config server-owned validada (`CAREER_LLM_TIMEOUT_MS` default 15000, `CAREER_LLM_MAX_RETRIES` default 1, modelo server-owned sem hardcode); `openai` só `configured` com API key **e** modelo; **sem fallback silencioso** openai→mock; retry limitado (`429/502/503/504`/timeout); erros client-safe sem stack trace/payload bruto; observabilidade sem secrets (`provider`, `modelAlias`, `durationMs`, `externalProviderCalled`, `validationStatus`, `retryCount`, usage). Adiciona `GET /career-llm/health` (`career-llm/health/route.ts`): status client-safe (`enabled`, `provider`, `configured`, `modelAlias`, `reachable`); **não** chama a API em todo request (`reachable` null sem probe; probe explícito `?probe=true` faz lookup leve sem custo de tokens); sem secrets/URL interna; `POST` → 405. `mock` permanece padrão; OpenAI é opt-in; revisão humana obrigatória; sem persistência; sem tool execution.
- **2026-06-18** — PR #123 adiciona três agentes especialistas (`resume_analyst`, `ats_analyst`, `career_strategy_advisor`) ao boundary multiagente existente, **sem novas rotas**: reutiliza `POST /career-agents/orchestrate`, `POST /career-chat/librechat` e `POST /career-llm/generate`. Novos intents determinísticos `analyze_resume → resume_analyst`, `analyze_ats_compatibility → ats_analyst`, `plan_career_strategy → career_strategy_advisor` (roteamento server-owned; cliente não escolhe agent/task/model/tool/capability/execution plan/approval). Inputs especialistas chegam em `context.analysisInput` (schema strict + scanner de chaves proibidas; sem arquivo/URL/HTML/script/command/filesystem/token/raw email). Score ATS determinístico e bounded (0–100) calculado no servidor — o LLM apenas explica. Proposals **não-executáveis** (`career.prepare_resume_review`, `career.prepare_ats_review`, `career.prepare_strategy_review`, `career.export_review_payload`) fora do registry invokável (nunca chamam `/career-tools/invoke`). Tasks LLM opcionais (`generate_resume_improvement_explanation`, `generate_ats_compatibility_explanation`, `generate_career_strategy_explanation`) só explicam/organizam (`store:false`, `stream:false`, strict output, `reviewRequired:true`, `toolExecutionOccurred:false`, `persisted:false`). Sem nova automação/persistência/memória/background; `GET` continua `405` onde já proibido.

- **2026-06-18** — PR prepara a Career Suite para piloto de produção controlado em `apps/applyflow`, adicionando rotas **operacionais** client-safe (sem novos agents/providers/automations/persistência): `GET /career-system/health` (agregado dos boundaries existentes; sem probe externo por padrão; `?probe=true` com timeout bounded; `503` quando `unhealthy`; `POST` → 405), `GET /career-system/livez` (apenas processo; sem provider/DB; `POST` → 405), `GET /career-system/readyz` (init + config obrigatória válida + boundaries carregados + DB se configurado; `503` quando `not_ready`; `POST` → 405) e `POST /career-feedback` (feedback explícito consent-gated; persiste só com `consentToStore:true`; repository default `discard`; sem currículo/vaga/provider payload/email/fingerprint; `GET` → 405). Adiciona também a página interna de diagnóstico `/dashboard/system-status` (development-only ou protegida por `CAREER_SYSTEM_STATUS_ENABLED` em produção; mostra ambiente, versão, status agregado, flags sem secrets, componentes, errorCodes e métricas in-memory; nenhum payload sensível). Observabilidade client-safe (`CareerOperationalEvent` allowlisted, logger estruturado sanitizado, correlationId `career_<uuid>`, métricas in-memory) e validação de configuração centralizada nunca serializam secret/token/URL interna. Integrações externas permanecem default-off; OpenClaw desligado; `CAREER_AUTOMATION_PROVIDER=mock`; sem tool execution, mutation ou persistência silenciosa.
- **2026-06-18** — PR #124 (build fix): `/admin/metrics` (`src/app/admin/metrics/page.tsx`) passa a declarar `export const dynamic = "force-dynamic"` porque `getMetrics()` → `getRevenueMetrics()` usa Prisma (`userPlan.findMany`) e não pode rodar durante static prerender/build sem banco. Path, ownership e contrato HTTP inalterados; página continua server-side e protegida; consulta ao banco apenas em request-time; CI passa a incluir job `build` (`pnpm -w run build`) sem `DATABASE_URL` nem providers reais.
- **2026-07-20** — PR #145 (`fix/whatsapp-conversation-assignment-lifecycle`): **nenhuma rota nova**; caminhos existentes preservados em `apps/whatsapp-platform`. Mudança de **contrato/comportamento** (ownership lifecycle), não de topologia nem cutover: `POST /api/inbox/conversations/:id/assign` e `POST /api/admin/conversations/:id/assign` aplicam claim CAS, autorização de transferência/liberação, respostas **403/404/409** e no-op idempotente sem side effects; `GET /api/inbox/queue/next` com `assign=true` só devolve thread após claim CAS bem-sucedido e responde **403/404/409** sem thread em falha (conflito first-writer-wins). App dono inalterado (`whatsapp-platform`); sem alteração de host/domínio ou redirects de portal.

## 7. Responsabilidade

- **Dono da política:** time de engenharia / arquitetura (revisar a cada trimestre ou após novo produto).  
- **Dono da matriz:** atualizar junto com qualquer cutover de rotas.

---

*Documento de policy; não substitui decisão de produto sobre domínios de produção.*
