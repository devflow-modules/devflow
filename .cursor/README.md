# `.cursor` — orquestração operacional DevFlow

Camada **versionada** de governança e operação assistida por IA no monorepo `devflow-modules/devflow`.

Não substitui código, contratos reais nem CI. Organiza **papéis**, **fluxos**, **prompts reutilizáveis** e **técnicas**, apontando sempre para fontes canônicas.

---

## 1. Propósito

| Objetivo | Não-objetivo |
|----------|--------------|
| Padronizar como agentes (humanos + Cursor) planejam, auditam e entregam mudanças | Criar runtime, APIs ou automações que commitam/mergeiam sozinhas |
| Reutilizar o método de auditoria/hardening validado na prática | Duplicar rules, CURRENT-SCOPE ou runbooks de produto |
| Tornar gates e boundaries descobertos sem reescrever prompts longos | Substituir revisão humana |

Automações Cursor em modo revisão: [`docs/operations/CURSOR_AUTOMATIONS.md`](../docs/operations/CURSOR_AUTOMATIONS.md) — **review-only**; sem commit/merge automático sem autorização explícita.

---

## 2. Camadas operacionais e precedência

### Ordem de descoberta e uso

```text
AGENTS.md
→ rules (.cursor/rules)
→ skills (.cursor/skills)
→ agents (.cursor/agents)          # papéis lógicos
→ workflows (.cursor/workflows)    # orquestração
→ commands (.cursor/commands)      # entradas reutilizáveis
→ docs canônicas (docs/, apps/*/docs)
→ CI (GitHub Actions / scripts)
```

Ferramentas externas (**MCP**) ficam **ao lado** desta navegação — ver [§ MCPs](#mcps). Não fazem parte da cadeia de autoridade.

Essa sequência descreve **como navegar** pela plataforma operacional, **não** a precedência em caso de conflito.

### Precedência em conflito (do mais forte ao mais fraco)

1. Código e contratos reais (tipos, testes, schema, handlers)
2. Documentação canônica do domínio
3. [`AGENTS.md`](../AGENTS.md)
4. Rules aplicáveis (por `alwaysApply` / globs)
5. Workflow selecionado
6. Agent / papel lógico
7. Skill
8. Command

Um **command não pode** sobrescrever rule, contrato real ou decisão de produto documentada. Em conflito: parar e pedir decisão humana.

O **CI** não redefine o contrato do domínio, mas constitui **enforcement obrigatório**: um gate falhando bloqueia a entrega até correção ou decisão humana explícita conforme a governança do repositório.

---

## 3. Quando usar cada camada

| Camada | Função | Exemplo |
|--------|--------|---------|
| **AGENTS.md** | Constituição do repo | Escopo habitual do agente, migrations, SaaS |
| **rules** | Guardrails automáticos por escopo | `01-security-and-secrets.mdc`, `05-whatsapp-platform.mdc` |
| **skills** | Técnicas específicas | `whatsapp-platform-safe-change`, `prisma-safe-migration`, `product-grill` |
| **agents** | Papéis lógicos (não processos autónomos) | `backend-engineer`, `security-reviewer` |
| **workflows** | Sequência de papéis + decisões + gates | `audit-hardening`, `feature`, `bugfix` |
| **commands** | Prompt curto para tarefa recorrente | `/map-impact`, `/fix-ci`, `/audit-domain` |
| **docs canônicas** | Fonte de verdade do domínio | `docs/whatsapp-platform/CURRENT-SCOPE.md` |
| **CI** | Gates objetivos | routing-governance, test:node, lint:design-system |

Inventário pré-orquestração: [`INVENTORY.md`](./INVENTORY.md).

---

## MCPs

Política: [`MCP.md`](./MCP.md). Inventário da fundação: [`MCP-INVENTORY.md`](./MCP-INVENTORY.md).

MCPs fornecem **ferramentas externas**. Não substituem agents, workflows, rules, testes ou CI.

```text
rules / workflows / agents
→ autorizam e orientam uso
→ MCP executa consulta ou ação externa
→ revisão humana
→ CI
```

| Configuração | Conteúdo |
|--------------|----------|
| Partilhada (Git) | [`.cursor/mcp.json`](./mcp.json) — sem segredos (Playwright isolado nesta fundação) |
| Com credenciais | `~/.cursor/mcp.json` ou UI Cursor — **nunca** versionada |
| Exemplos | [`examples/`](./examples/) — **não** carregados automaticamente |

Aprovados (fundação): Playwright (projeto), GitHub read-only (global), Supabase read-only project-scoped (global/local). Deferidos: Filesystem/Git genéricos, Stripe, Meta/WhatsApp Cloud, Postgres de produção, comunitários sem review.

Command: [`/audit-mcp`](./commands/audit-mcp.md).

---

## 4. Apps e domínios (owners)

Não inventar ownership. Resumo alinhado a [`ARCHITECTURE.md`](../ARCHITECTURE.md) e [`docs/architecture/PLATFORM-STANDARD.md`](../docs/architecture/PLATFORM-STANDARD.md):

| Superfície | Owner típico | Notas |
|------------|--------------|--------|
| Portal raiz (`src/`) | Portal / marketing + hub | `devflowlabs.com.br`; redirects/cutover |
| WhatsApp Platform | `apps/whatsapp-platform` | Runtime canónico (auth, Stripe, inbox, webhook Meta no app) |
| WhatsApp webhook API | `apps/whatsapp-webhook-api` | **legacy-compatible** — não adicionar features de produto |
| Financeiro | `apps/financeiro` (+ rotas portal documentadas) | Cutover: docs Financial + `@devflow/financeiro-routes` |
| Packages | `packages/*` | Partilha só via packages; apps não importam apps |
| HealthSafe × RPA | docs + regra `06-healthsafe-rpa.mdc` | Contratos em `docs/healthsafe-rpa/` |

WhatsApp — mapa e escopo: [`docs/whatsapp-platform/DOCUMENTATION-MAP.md`](../docs/whatsapp-platform/DOCUMENTATION-MAP.md), [`CURRENT-SCOPE.md`](../docs/whatsapp-platform/CURRENT-SCOPE.md), [`ARCHITECTURE.md`](../docs/whatsapp-platform/ARCHITECTURE.md).

Routing: [`docs/architecture/ROUTING_POLICY.md`](../docs/architecture/ROUTING_POLICY.md), [`docs/site/MATRIZ-DECISAO-ROTAS.md`](../docs/site/MATRIZ-DECISAO-ROTAS.md).

---

## 5. Quality gates

Listas detalhadas de comandos **envelhecem**. Preferir:

| Fonte | Conteúdo |
|-------|----------|
| [`.cursor/rules/02-testing-quality-gates.mdc`](./rules/02-testing-quality-gates.mdc) | Política de testes |
| [`.cursor/skills/whatsapp-platform-safe-change.md`](./skills/whatsapp-platform-safe-change.md) | Gates por tipo de mudança no WhatsApp |
| [`.cursor/rules/05-whatsapp-platform.mdc`](./rules/05-whatsapp-platform.mdc) | Boundaries e gates WhatsApp |
| `apps/<app>/package.json` scripts | `test:node`, `test:ui`, `lint`, etc. |
| `scripts/ci/*` + `.github/workflows/*` | Gates de monorepo (ex. routing-governance) |

**Matriz resumida (orientativa):**

| Tipo de mudança | Gate mínimo típico |
|-----------------|-------------------|
| Serviço / rota API | testes node focados + lint |
| UI inbox / design system | `test:ui` + lint design-system / buttons (quando aplicável) |
| Auth, billing, webhook, middleware | testes de regressão do domínio + security review |
| `route.ts` / `page.tsx` | routing-governance + nota em policy/matriz se contrato mudar |
| Prisma / migration | skill `prisma-safe-migration` + aprovação humana se destrutivo |

Nunca representar teste **skipped** como sucesso.

---

## 6. Fluxo padrão

```text
entender pedido
→ localizar owner
→ mapear impacto
→ auditar estado real
→ classificar gaps
→ decidir escopo
→ implementar
→ testar
→ documentar
→ revisar diff
→ PR
```

Commands úteis: [`map-impact`](./commands/map-impact.md), [`audit-domain`](./commands/audit-domain.md), [`plan-feature`](./commands/plan-feature.md).

---

## 7. Fluxo para PRs críticos

```text
governança
→ mapa de impacto
→ auditoria sem edição
→ decisão humana
→ implementação mínima
→ gates
→ revisão
→ merge
```

Workflow formal: [`workflows/audit-hardening.md`](./workflows/audit-hardening.md).

Exemplos históricos (não dependência operacional): PRs de governança WhatsApp, lifecycle de status da inbox e lifecycle de assignment/ownership — o método está no workflow, não nos números de PR.

---

## 8. Review-only automations

Ver [`docs/operations/CURSOR_AUTOMATIONS.md`](../docs/operations/CURSOR_AUTOMATIONS.md).

- Automações v1 **não** devem editar, commitar, abrir branch ou mergear sem autorização explícita.
- Agents/workflows/commands aqui são **orientação versionada**, não substitutos de Automations configuradas no produto Cursor.

---

## Índice rápido

### Agents (papéis)

| Papel | Ficheiro |
|-------|----------|
| Product Owner | [`agents/product-owner.md`](./agents/product-owner.md) |
| Platform Architect | [`agents/platform-architect.md`](./agents/platform-architect.md) |
| Frontend Engineer | [`agents/frontend-engineer.md`](./agents/frontend-engineer.md) |
| Backend Engineer | [`agents/backend-engineer.md`](./agents/backend-engineer.md) |
| Database Engineer | [`agents/database-engineer.md`](./agents/database-engineer.md) |
| Security Reviewer | [`agents/security-reviewer.md`](./agents/security-reviewer.md) |
| QA Engineer | [`agents/qa-engineer.md`](./agents/qa-engineer.md) |
| Documentation Engineer | [`agents/documentation-engineer.md`](./agents/documentation-engineer.md) |
| Release Manager | [`agents/release-manager.md`](./agents/release-manager.md) |

### Workflows

| Workflow | Ficheiro |
|----------|----------|
| Feature | [`workflows/feature.md`](./workflows/feature.md) |
| Bugfix | [`workflows/bugfix.md`](./workflows/bugfix.md) |
| Audit & hardening | [`workflows/audit-hardening.md`](./workflows/audit-hardening.md) |
| Migration | [`workflows/migration.md`](./workflows/migration.md) |
| Release | [`workflows/release.md`](./workflows/release.md) |
| Product validation | [`workflows/product-validation.md`](./workflows/product-validation.md) |

### Commands

| Command | Ficheiro |
|---------|----------|
| `/plan-feature` | [`commands/plan-feature.md`](./commands/plan-feature.md) |
| `/map-impact` | [`commands/map-impact.md`](./commands/map-impact.md) |
| `/audit-domain` | [`commands/audit-domain.md`](./commands/audit-domain.md) |
| `/create-tests` | [`commands/create-tests.md`](./commands/create-tests.md) |
| `/review-pr` | [`commands/review-pr.md`](./commands/review-pr.md) |
| `/fix-ci` | [`commands/fix-ci.md`](./commands/fix-ci.md) |
| `/update-docs` | [`commands/update-docs.md`](./commands/update-docs.md) |
| `/release-notes` | [`commands/release-notes.md`](./commands/release-notes.md) |
| `/retro` | [`commands/retro.md`](./commands/retro.md) |
| `/validate-product` | [`commands/validate-product.md`](./commands/validate-product.md) |
| `/audit-mcp` | [`commands/audit-mcp.md`](./commands/audit-mcp.md) |

### Skills (técnicas + produto)

Skills existentes (intactas): `whatsapp-platform-safe-change`, `prisma-safe-migration`, `test-hardening`, `nextjs-ui-polish`, `devflow-github-issue`.

Skills de produto (esta camada):

- [`skills/product-grill.md`](./skills/product-grill.md)
- [`skills/revenue-centric-design.md`](./skills/revenue-centric-design.md)

### Rules

Índice em [`.cursor/rules/`](./rules/) — não duplicar aqui; aplicar por glob/`alwaysApply`.
