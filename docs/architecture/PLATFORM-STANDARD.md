# Padrão de plataforma DevFlow — apps, rotas, validação e deploy

**Objetivo:** um único lugar que liga **governança → merge → deploy → verificação real**, para repetir o modelo em qualquer app do monorepo (Financeiro, WhatsApp Platform, Investigamais, próximos SaaS).

**Não duplica** políticas longas: aponta para os artefatos canônicos.

---

## 1. Princípios

| Princípio | Significado prático |
|-----------|---------------------|
| **Portal = aquisição** | A raiz (`src/app`) é **marketing, SEO, CTAs e redirects** para os apps — não é o runtime operacional dos produtos SaaS. |
| **Financeiro = app isolado** | Dashboard, auth de produto, billing de produto e APIs de dados do Financeiro vivem em **`apps/financeiro`** (host/deploy próprio quando aplicável). |
| Dono da rota | Toda superfície (`page.tsx` / `route.ts` / redirect) tem **app e fase** definidos na matriz e no registro em código. |
| Gate antes do merge | Mudança de rota sem atualizar governança/docs listados → CI de PR falha. |
| Verificação após deploy | Smoke **HTTP real** contra produção (ou URL explícita): status, redirects, auth, performance básica — não substitui E2E, complementa. |
| Cutover em blocos | Migração estrutural segue **runbook + tags + gate entre blocos**, não big bang. |

---

## 2. Criar ou estender um app

1. **Inventário e decisão** — `docs/site/INVENTARIO-ROTAS-MONOREPO.md`, `docs/site/MATRIZ-DECISAO-ROTAS.md`.
2. **Política** — `docs/architecture/ROUTING_POLICY.md`.
3. **Registro** — `src/lib/routing-governance.ts` (e paths cobertos pelo script de CI).
4. **Env / URLs** — `docs/ENV_STRUCTURE.md`, `.env.example`; variáveis públicas por app (`NEXT_PUBLIC_*`) alinhadas ao host de deploy.
5. **PR** — checklist em `.github/pull_request_template.md` (rotas).

**Feature-level (exemplo):** padrão de novas features no domínio Financeiro (Zod, service, rota, testes, eventos) — `docs/financeiro/FINANCEIRO-FEATURE-STANDARD.md` (referencia este doc em *Ver também*).

---

## 3. Validar rotas

| Camada | O quê | Onde |
|--------|--------|------|
| PR | Governança (diff de rotas vs docs/registro) | `scripts/ci/check-routing-governance.sh`, workflow **Routing governance** |
| Pós-deploy | Smoke curl (público, protegido, precos, strict opcional) | `scripts/ops/validate-routes.sh` |
| CI automático | Mesmo script contra produção (`vars.ROUTE_VALIDATE_*` opcionais no reutilizável) | `validate-routes-after-deploy.yml` → `validate-routes-after-deploy-reusable.yml` |
| CI WhatsApp | Cutover portal → app, APIs removidas na raiz, webhook app | `validate-whatsapp-cutover.yml` → `validate-whatsapp-cutover-reusable.yml` |

**Variáveis úteis do script:** ver cabeçalho de `scripts/ops/validate-routes.sh`. Exemplo local: `scripts/ops/validate-routes.financeiro.env.example`.

**Variáveis GitHub (opcional):** `ROUTE_VALIDATE_BASE_URL`, `ROUTE_VALIDATE_FINANCEIRO_APP_URL`.

---

## 4. Deploy e ordem recomendada

1. Merge na branch protegida após **Routing governance** verde (e demais checks do repositório).
2. Deploy no provedor (ex.: Vercel).
3. Quando o deploy estiver **concluído**, preferir disparar **Validate routes (post-deploy)** manualmente (`workflow_dispatch`) ou via hook — `push` em `main` pode anteceder o deploy.
4. Cutover grande: runbooks — [CUTOVER-FINANCEIRO-RUNBOOK-MAIN.md](./CUTOVER-FINANCEIRO-RUNBOOK-MAIN.md), [CUTOVER-WHATSAPP-RUNBOOK-MAIN.md](./CUTOVER-WHATSAPP-RUNBOOK-MAIN.md). Após deploy do portal/app WhatsApp: workflows **Validate routes** e **Validate WhatsApp cutover**.

**Épicos / planos:** `docs/architecture/EPICO-FINANCEIRO-CUTOVER.md`, `docs/architecture/PR1-CUTOVER-FINANCEIRO-PLANO-TECNICO.md`, `docs/architecture/ROUTING_MIGRATION_EXECUCAO.md`.

---

## 5. Próximas extensões (quando fizer sentido)

- **Perfil por app** — mesmo script com `BASE_URL` / paths diferentes ou wrapper `--profile` (hoje: env + asserts comentados no script).
- **CLI** — `npx devflow validate routes` chamando o mesmo bash ou API interna.
- **Cron** — `schedule` no workflow para monitoramento periódico (custo e ruído: avaliar por app).

---

## 6. Checklist rápido “novo produto no monorepo”

- [ ] Rotas novas documentadas na matriz e no `routing-governance.ts`.
- [ ] PR template preenchido quando tocar em `page.tsx` / `route.ts`.
- [ ] URLs de produção/staging definidas (vars ou doc).
- [ ] Smoke pós-deploy ajustado (env ou novo job) antes de tráfego relevante.
- [ ] Runbook de cutover copiado/adaptado se houver migração de rotas legadas.

---

**Resumo:** este ficheiro é o **índice operacional** da plataforma; a autoridade normativa continua em `ROUTING_POLICY.md` e nos docs linkados acima.
