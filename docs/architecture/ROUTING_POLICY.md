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

## 7. Responsabilidade

- **Dono da política:** time de engenharia / arquitetura (revisar a cada trimestre ou após novo produto).  
- **Dono da matriz:** atualizar junto com qualquer cutover de rotas.

---

*Documento de policy; não substitui decisão de produto sobre domínios de produção.*
