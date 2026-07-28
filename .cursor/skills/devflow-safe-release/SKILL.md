---
name: devflow-safe-release
description: >-
  Guides safe release readiness with preflight, migrations, tests/build,
  deploy, smoke, rollback and sanitized evidence. Use before merge, cutover or
  go-live; missing required entrypoints return BLOCK without improvising.
---

# DevFlow — safe release

## Objetivo

Produzir readiness `go` / `no-go` / `blocked` para merge, cutover ou go-live, com evidências sanitizadas e rollback conhecido. Capacidade: `action-enabled com aprovação` — default é **readiness review**; migrate deploy, `deploy:prod` e cutover de produção só com autorização humana explícita.

## Gatilhos de uso

- PR crítico saindo de draft / pedido de readiness.
- Cutover, go-live ou validação pós-merge.
- Workflow [`release`](../../workflows/release.md) / command [`/release-notes`](../../commands/release-notes.md).
- Papel [`release-manager`](../../agents/release-manager.md).

Não usar para implementar features, improvisar scripts ausentes, recovery operacional de E2E, nem merge/deploy automático.

## Entradas obrigatórias

- App/owner e escopo da release (portal, `apps/whatsapp-platform`, `apps/financeiro`, outro).
- Diff estável + riscos/deferred no PR.
- Resultados reais de CI/gates (`pass` | `fail` | `skipped` | `blocked` | `not run`).
- Entrypoints exigidos pelo escopo **presentes no tree** (script, workflow ou runbook). Ausente → `blocked`.
- Checklist/runbook canônico do domínio quando existir, por exemplo:
  - [`AGENTS.md`](../../../AGENTS.md);
  - [`DEPLOYMENT.md`](../../../docs/shared/DEPLOYMENT.md);
  - WhatsApp: [`PRODUCTION_CHECKLIST.md`](../../../docs/whatsapp/PRODUCTION_CHECKLIST.md), [`WHATSAPP-PRODUCTION-SIGNOFF.md`](../../../docs/architecture/WHATSAPP-PRODUCTION-SIGNOFF.md), [`GO_LIVE_WHATSAPP_PLATFORM.md`](../../../apps/whatsapp-platform/docs/ops/GO_LIVE_WHATSAPP_PLATFORM.md);
  - migrations: [`prisma-safe-migration`](../prisma-safe-migration/SKILL.md).
- Plano de rollback do domínio (secção existente no runbook) ou `blocked` se indefinido para produção.
- Autorização explícita antes de qualquer migrate/deploy em produção.

## Fluxo operacional

1. **Preflight**
   - Confirmar owner, superfície e entrypoints (`package.json` scripts, workflows `.github/workflows/*`, runbooks).
   - Se um entrypoint obrigatório do escopo não existir → `blocked` e parar (não inventar comando).
   - Confirmar que o relatório não vai incluir secrets/PII.

2. **Migrations**
   - Se houver mudança de schema: seguir [`prisma-safe-migration`](../prisma-safe-migration/SKILL.md) e o schema owner correto.
   - Não aplicar `db:migrate` / `db:migrate:deploy` em produção sem aprovação explícita.
   - Sem plano de rollback/backfill quando necessário → `blocked`.

3. **Testes / build**
   - Usar apenas scripts reais do app/raiz (ex. `test:node`, `test:ui`, `build`, `lint:ci`, gates CI do domínio).
   - Registrar cada gate com status honesto; `skipped` ≠ `pass`.
   - WhatsApp inbox E2E seguro: só via [`whatsapp-e2e-safe-gate`](../whatsapp-e2e-safe-gate/SKILL.md) quando o entrypoint existir; senão `blocked`/`not run` conforme escopo.

4. **Deploy**
   - Default: não executar deploy.
   - Com aprovação explícita: usar somente entrypoints documentados (ex. `deploy:preview`, `deploy:prod`, cutover docs). Ausente → `blocked`.
   - Sem bypass de CI vermelho.

5. **Smoke**
   - Preferir scripts/checklists existentes do domínio (`smoke`, validate-routes/cutover, checklists de auth/inbound).
   - Entrypoint de smoke exigido e ausente → `blocked`.
   - Evidência sanitizada (IDs opacos, sem tokens/URLs com credencial).

6. **Rollback**
   - Citar o procedimento existente no runbook do domínio.
   - Sem rollback conhecido para mudança produtiva → `no-go` / `blocked`.

7. **Evidências e veredito**
   - Compilar matriz preflight → migrations → testes/build → deploy → smoke → rollback.
   - Emitir `go` | `no-go` | `blocked` com riscos residual/deferred.

## Guardrails

- Nunca afirmar “verde” sem log/comando executado ou CI citado.
- Nunca inventar script, workflow ou checklist ausente.
- Nunca tratar skipped/E2E sem credenciais como sucesso.
- Nunca colar `.env`, PAT, JWT, webhook assinado, connection string com password ou PII.
- Nunca mergear, fazer push forçado, dispatch de workflow destrutivo ou deploy de produção sem autorização humana.
- Automações Cursor permanecem review-only ([`CURSOR_AUTOMATIONS.md`](../../../docs/operations/CURSOR_AUTOMATIONS.md)).
- Não misturar branch operacional de recovery E2E neste fluxo.

## Stop conditions

Parar com `blocked` / pedir humano quando:

- entrypoint obrigatório ausente no tree;
- CI bloqueante vermelho, ambíguo ou não representado honestamente;
- migrate/deploy/cutover de produção sem aprovação explícita;
- alvo parecer produção/shared sem decisão humana;
- rollback indefinido para mudança produtiva;
- secrets ou PII apareceriam no relatório;
- runbook canônico do domínio estiver ausente e o risco for alto.

## Validações

- Cada etapa do fluxo classificada: `pass` | `fail` | `blocked` | `not run` | `skipped` (com motivo).
- Entrypoints citados existem no tree no momento da validação.
- Evidências sanitizadas e rastreáveis (job CI, comando, checklist).
- Migrations alinhadas a `prisma-safe-migration` quando aplicável.
- Veredito final coerente com o pior status bloqueante.

## Formato da entrega

```text
readiness: go | no-go | blocked
App / owner:
Preflight:
Migrations:
CI / tests / build:
Deploy (approval): none | approved | blocked
Smoke:
Rollback:
Evidence (sanitized):
Skipped / blocked / not run:
Residual risks / deferred:
Release notes hooks: Features | Fixes | Security | Tests | Migrations | Breaking | Deferred
```
