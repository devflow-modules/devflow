# Labels GitHub — DevFlow Labs

Este documento alinha labels do repositório com o monorepo (portal na raiz, `apps/whatsapp-platform`, `apps/financeiro`, packages, docs) e com fluxos **Cursor / Cloud Agents**. Complementa [`AGENTS.md`](https://github.com/gustavomarques00/devflow/blob/main/AGENTS.md) e os templates em [`.github/ISSUE_TEMPLATE/`](../../.github/ISSUE_TEMPLATE/). Para redirects e parâmetro `next`, ver também [`REDIRECT_SAFETY.md`](./REDIRECT_SAFETY.md).

> **Forks / rename:** os templates YAML usam links absolutos ao repo canónico; se o remoto for outro, actualize os URLs em `.github/ISSUE_TEMPLATE/cursor-*.yml`.

---

## Grupos de labels

### `area:*` — onde o trabalho acontece

| Label | Propósito |
|-------|-----------|
| `area:portal` | Next.js na raiz (`src/`), marketing, middleware partilhado, hub `devflowlabs.com.br`. |
| `area:whatsapp-platform` | App `apps/whatsapp-platform` (inbox, webhook Meta, Stripe, auth do produto). |
| `area:financeiro` | App `apps/financeiro` e rotas/cutover do Financeiro. |
| `area:healthsafe-rpa` | Alinhamento HealthSafe × RPA (sobretudo `docs/healthsafe-rpa/` e contratos). |
| `area:packages` | `packages/*` (billing-core, ui, whatsapp-routes, etc.). |
| `area:docs` | Documentação em `docs/` sem código de produto. |
| `area:infra` | Deploy, DNS, Vercel, observabilidade, scripts de ops (sem alterar código de app). |

**Quando usar:** exactamente **um** `area:*` principal por issue (híbrido raro: dois se o PR cruzar fronteiras documentadas).

---

### `type:*` — natureza do trabalho

| Label | Propósito |
|-------|-----------|
| `type:bug` | Comportamento incorrecto ou regressão. |
| `type:feature` | Nova capacidade ou extensão de produto. |
| `type:chore` | Manutenção, deps, limpeza sem impacto funcional directo. |
| `type:refactor` | Reestruturação interna sem mudar contrato externo. |
| `type:test` | Só testes, fixtures, mocks. |
| `type:docs` | Só documentação. |

---

### `risk:*` — superfícies sensíveis (pode haver vários)

| Label | Propósito |
|-------|-----------|
| `risk:auth` | Supabase, sessão, JWT, roles, rotas protegidas. |
| `risk:billing` | Stripe, planos, quotas, checkout, uso medido. |
| `risk:db` | Prisma, queries, índices, migrações (mesmo só “rever”). |
| `risk:webhook` | Meta WhatsApp, Stripe webhooks, idempotência, retries. |
| `risk:tenant-isolation` | Risco de misturar dados entre tenants ou contornar filtros. |
| `risk:production` | Impacto directo ou deploy imediato em produção. |
| `risk:ui-regression` | Design system, tokens, a11y, layouts críticos. |

**Quando usar:** marcar **todos** os riscos que um humano ou agente deve ter em conta antes de merge. Issues só de documentação podem não precisar de `risk:*`.

---

### `cursor:*` — estado e limites para agentes

| Label | Propósito |
|-------|-----------|
| `cursor:ready` | Contexto suficiente (critérios, área, riscos); pode arrancar implementação ou review automatizado. |
| `cursor:needs-plan` | Falta desenho ou acordo; o agente não deve “atirar código” até clarificar. |
| `cursor:small-diff` | Exigência explícita de PR mínimo e revista. |
| `cursor:review-only` | Só análise / comentários / checklist — **sem** commits no branch alvo (ex.: revisão de PR). |
| `cursor:do-not-edit-env` | Proibido alterar `.env*`. |
| `cursor:do-not-touch-db` | Sem migrations nem mudanças destrutivas em schema. |
| `cursor:requires-tests` | Acrescentar ou correr testes direcionados (Vitest) como parte do trabalho. |

**Quando usar `cursor:ready`**

- Critérios de aceitação ou reprodução estão claros.
- Área (`area:*`) e riscos relevantes estão identificados.
- Não há dependência bloqueante não resolvida (ex.: decisão de produto em aberto).

**Quando usar `cursor:review-only`**

- Issue liga a um PR existente e pede **só** revisão (segurança, tenant, performance, estilo).
- Não se pretende que o agente implemente — apenas feedback ou lista de achados.

**Quando usar `risk:*` em conjunto**

- Sempre que o código possa afectar auth, billing, DB, webhooks ou isolamento — mesmo que a mudança pareça pequena.
- `risk:production` reforça necessidade de smoke ou validação pós-deploy documentada no repo.

---

### `needs:*` — gates ou follow-ups

| Label | Propósito |
|-------|-----------|
| `needs:smoke-routes` | Validar redirects / rotas (portal × apps, middleware). |
| `needs:build` | Confirmar `build` do workspace ou app filtrado. |
| `needs:migration-review` | PR toca ou propõe Prisma/migrations — revisão humana obrigatória. |
| `needs:security-review` | Superfície sensível (auth, webhooks, dados). |
| `needs:docs-update` | Actualizar `docs/` ou README de produto após merge. |

---

## Criar labels no GitHub (CLI)

Com [GitHub CLI](https://cli.github.com/) autenticado (`gh auth login`):

```bash
OWNER_REPO="gustavomarques00/devflow"  # ajustar se necessário

for l in \
  "area:portal|003b46|Portal raiz" \
  "area:whatsapp-platform|1d76db|WhatsApp Platform" \
  "area:financeiro|5319e7|Financeiro" \
  "area:healthsafe-rpa|6f42c2|HealthSafe RPA" \
  "area:packages|0e8a16|Packages" \
  "area:docs|cccccc|Docs" \
  "area:infra|000000|Infra" \
  "type:bug|d73a4a|Bug" \
  "type:feature|0e8a16|Feature" \
  "type:chore|fef2c0|Chore" \
  "type:refactor|5319e7|Refactor" \
  "type:test|1d76db|Test" \
  "type:docs|cccccc|Docs type" \
  "risk:auth|b60205|Risk auth" \
  "risk:billing|f9d0c4|Risk billing" \
  "risk:db|5319e7|Risk DB" \
  "risk:webhook|1d76db|Risk webhook" \
  "risk:tenant-isolation|b60205|Risk tenant" \
  "risk:production|d73a4a|Risk prod" \
  "risk:ui-regression|f9d0c4|Risk UI" \
  "cursor:ready|0e8a16|Cursor ready" \
  "cursor:needs-plan|fef2c0|Cursor needs plan" \
  "cursor:small-diff|5319e7|Cursor small diff" \
  "cursor:review-only|1d76db|Cursor review only" \
  "cursor:do-not-edit-env|b60205|Cursor no env" \
  "cursor:do-not-touch-db|b60205|Cursor no DB" \
  "cursor:requires-tests|0e8a16|Cursor tests" \
  "needs:smoke-routes|1d76db|Needs smoke routes" \
  "needs:build|5319e7|Needs build" \
  "needs:migration-review|b60205|Needs migration review" \
  "needs:security-review|b60205|Needs security review" \
  "needs:docs-update|cccccc|Needs docs"; do
  name="${l%%|*}"
  rest="${l#*|}"
  color="${rest%%|*}"
  desc="${rest#*|}"
  gh label create "$name" --color "$color" --description "$desc" --repo "$OWNER_REPO" 2>/dev/null || gh label edit "$name" --color "$color" --description "$desc" --repo "$OWNER_REPO"
done
```

*(Comandos `create`/`edit` dependem da versão do `gh`; se `edit` falhar em labels novos, ignore o segundo comando ou crie manualmente na UI.)*

---

## Exemplos de issues bem rotuladas

1. **Bug no webhook (tenant incorrecto)**  
   `area:whatsapp-platform`, `type:bug`, `risk:webhook`, `risk:tenant-isolation`, `risk:production`, `cursor:ready`, `cursor:requires-tests`, `needs:security-review`

2. **Feature de UI na inbox**  
   `area:whatsapp-platform`, `type:feature`, `risk:ui-regression`, `cursor:small-diff`, `cursor:requires-tests`, `needs:smoke-routes`

3. **Refactor de módulo interno sem mudar API**  
   `area:packages`, `type:refactor`, `cursor:needs-plan`, `cursor:small-diff`, `cursor:do-not-touch-db`

4. **Revisão de PR que toca Stripe**  
   `area:whatsapp-platform`, `type:chore`, `cursor:review-only`, `risk:billing`, `risk:webhook`, `needs:security-review`

5. **Actualização de doc HealthSafe × RPA**  
   `area:healthsafe-rpa`, `type:docs`, `needs:docs-update` (sem `risk:*` se não houver mudança de runtime)

---

## Ficheiros relacionados

- [`.github/ISSUE_TEMPLATE/cursor-feature.yml`](../../.github/ISSUE_TEMPLATE/cursor-feature.yml) — funcionalidades  
- [`.github/ISSUE_TEMPLATE/cursor-bugfix.yml`](../../.github/ISSUE_TEMPLATE/cursor-bugfix.yml) — bugs  
- [`.github/ISSUE_TEMPLATE/cursor-refactor.yml`](../../.github/ISSUE_TEMPLATE/cursor-refactor.yml) — refactors  
- [`.github/ISSUE_TEMPLATE/cursor-review.yml`](../../.github/ISSUE_TEMPLATE/cursor-review.yml) — revisão de PR  
- [`.github/ISSUE_TEMPLATE/config.yml`](../../.github/ISSUE_TEMPLATE/config.yml) — issues em branco permitidas  

Após criar labels na org/repo, pode-se opcionalmente acrescentar `labels:` nos YAML dos templates para pré-preencher (cuidado: labels inexistentes falham na criação do issue).
