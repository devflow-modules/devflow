---
name: whatsapp-e2e-safe-gate
description: >-
  Guides the WhatsApp inbox safe E2E gate (ephemeral provision, target
  fingerprint, network isolation, receipt-scoped cleanup). Use when validating
  inbox E2E without permanent admin credentials; missing entrypoint or legacy
  marker recovery returns BLOCK.
---

# WhatsApp — E2E inbox safe gate

## Objetivo

Conduzir o ciclo canônico `test:e2e:inbox:safe` em `apps/whatsapp-platform` quando o entrypoint existir no tree: provisionar tenant/manager efêmeros, subir Next local isolado, executar `tests/e2e/inbox.spec.ts` em safe mode e limpar **somente** pelos IDs do recibo. Capacidade: `action-enabled com aprovação` (banco WhatsApp **não-prod** + cleanup).

Esta skill é **documental/procedimental**. Não implementa recovery excepcional de markers legados e não autoriza tocar em receipt/lock órfãos.

## Gatilhos de uso

- Validar regressão de inbox com E2E após mudança no app WhatsApp.
- Preferir o gate seguro em vez de `pnpm test:e2e:inbox` com credenciais admin manuais.
- Reproduzir falha de inbox E2E em ambiente local controlado.
- Readiness/release que cite este gate ([`devflow-safe-release`](../devflow-safe-release/SKILL.md)).

Não usar para smoke de produção, Meta Cloud real, billing Stripe live, onboarding de cliente real, nem para “destravar” lock/recibo legado.

## Entradas obrigatórias

- Autorização explícita humana para **uma** execução do gate (não reexecutar sem nova ordem).
- Autorização explícita para tocar no banco WhatsApp **não-prod** das envs locais.
- Working directory: `apps/whatsapp-platform`.
- Entrypoint **presente no tree atual**:
  - script `test:e2e:inbox:safe` em [`package.json`](../../../apps/whatsapp-platform/package.json);
  - orquestrador `scripts/e2e/run-inbox-e2e.ts`.
  - Ausente → `blocked` / `not run` (não improvisar scripts nem usar o gate clássico sem autorização separada).
- Datasource resolvível via `WHATSAPP_DIRECT_URL` (preferida) ou `WHATSAPP_DATABASE_URL` — **nunca** colar valores no chat, issue, commit ou skill.
- Markers ausentes antes de iniciar:
  - `tests/.auth/inbox-e2e-fixture.lock`
  - `tests/.auth/inbox-e2e-fixture.json`
- Contexto: [`AGENTS.md`](../../../AGENTS.md), [quality gates](../../rules/02-testing-quality-gates.mdc), [WhatsApp rule](../../rules/05-whatsapp-platform.mdc), [`ARCHITECTURE.md`](../../../docs/whatsapp-platform/ARCHITECTURE.md), [`TESTING.md`](../../../apps/whatsapp-platform/docs/TESTING.md).
- Skills relacionadas: [`whatsapp-platform-safe-change`](../whatsapp-platform-safe-change/SKILL.md), [`test-hardening`](../test-hardening/SKILL.md).

## Fluxo operacional

1. **Preflight**
   - Confirmar entrypoint no tree. Ausente → `blocked` e parar.
   - Confirmar alvo não-prod (sem colar URL/secrets).
   - Confirmar markers ausentes. Se lock/recibo existirem → `blocked`; **preservar** markers e pedir decisão humana.
   - Não apagar, mover ou reescrever markers nesta skill.

2. **Execução única autorizada**

   ```bash
   cd apps/whatsapp-platform
   corepack pnpm test:e2e:inbox:safe
   ```

3. **Contrato do orquestrador** (`scripts/e2e/run-inbox-e2e.ts`), nesta ordem:
   - resolver env (process < root `.env.local` < app `.env.local`) + fingerprint do alvo (host/port/db/user hashed; sem password);
   - adquirir lock exclusivo;
   - verificar fingerprint em provision → execution → cleanup;
   - provisionar tenant+manager **novos** (nunca adotar entidades existentes / DevFlow Sales);
   - gravar recibo atômico e **vincular** no lock `runId` + digest canônico do receipt (`bindReceipt`);
   - preparar artefatos em `tests/.auth/inbox-safe/`;
   - subir Next em `http://127.0.0.1:3099` e aguardar readiness em `/login`;
   - correr Playwright em `tests/e2e/inbox.spec.ts` com `INBOX_E2E_SAFE_MODE=1`, storage state controlado e allowlist de rede;
   - parar Playwright e Next;
   - exigir relatório de isolamento aprovado e artefatos controlados removidos;
   - cleanup DB **somente** pelos IDs do recibo; remover recibo; liberar lock.

4. **Aborto seguro**
   - Se o ciclo abortar com preservação de markers (`InboxMarkerPreservationError` ou equivalente) → **não** apagar markers. Reportar estado sanitizado e parar.

5. **Cleanup standalone**
   - `tsx scripts/e2e/cleanup-inbox-e2e.ts` só com recibo válido, fingerprint consistente e autorização explícita.
   - Nunca usar cleanup standalone como atalho para lock órfão / PID-only.

Gate clássico (`pnpm test:e2e:inbox`) exige `E2E_WHATSAPP_ADMIN_EMAIL` / `E2E_WHATSAPP_ADMIN_PASSWORD` manuais e **não** substitui o safe gate.

## Guardrails

- Nunca apontar o gate para produção ou banco compartilhado sem decisão humana explícita.
- Nunca logar, colar ou commitar passwords, connection strings, digests completos desnecessários, storage state, fingerprints brutos ou PII.
- Nunca adotar tenant/usuário existente; o fixture é efêmero e criado pelo provisionador.
- Nunca apagar `inbox-e2e-fixture.lock` / `.json` “para destravar” sem procedimento e autorização fora desta skill.
- Nunca implementar, documentar como procedimento permanente, ou invocar nesta skill:
  - recovery de lock legado PID-only;
  - heurísticas de vínculo unprovable;
  - flags do tipo `--recover-legacy-pid-lock` / `--accept-unprovable-legacy-link`;
  - entrypoint excepcional de recovery por snapshot/digests (esse código, se existir, vive em branch operacional separada — ex. PR de runtime E2E — com aprovação humana própria).
- Nunca misturar implementação de recovery nesta branch documental de skill.
- Nunca tratar skipped, markers preservados ou cleanup incompleto como sucesso.
- Não misturar Meta Cloud real, Stripe live ou dados de cliente neste gate.
- Não reexecutar o gate “para confirmar” sem nova autorização explícita.

## Stop conditions

Parar e escalar para humano quando:

- `test:e2e:inbox:safe` / `scripts/e2e/run-inbox-e2e.ts` não existir no tree atual;
- faltar `WHATSAPP_DIRECT_URL` / `WHATSAPP_DATABASE_URL` ou o alvo parecer produção/shared;
- fingerprint divergir entre etapas;
- lock ou recibo já estiverem ativos / concorrentes;
- lock existir sem `runId` + digest vinculados ao recibo (formato legado, PID-only ou órfão);
- isolamento de rede/artefatos não for aprovado;
- cleanup incompleto (recibo/lock permanecem) ou shutdown de processos não for comprovado;
- porta `3099` permanecer ocupada ou houver processo residual do ciclo;
- for pedido de recovery excepcional de markers — **fora do escopo permanente desta skill** (`blocked` aqui).

## Validações

- Entrypoint e working directory corretos (`pass` | `blocked` | `not run`).
- Autorização de execução única registada.
- Comando executado (ou `blocked`/`not run` justificado).
- Fingerprint verificado nas três etapas quando o ciclo completar.
- Playwright/inbox: contagem honestamente reportada; `skipped` ≠ `pass`.
- Isolamento: relatório aprovado ou falha explícita.
- Cleanup: contagens sanitizadas quando disponíveis (ex. sessions/audits removidos).
- Pós-sucesso: receipt e lock ausentes; porta `3099` livre; sem processo residual do runner/Playwright/Next do ciclo.
- Nenhum secret/PII no relatório.
- Classificar cada validação como `pass`, `fail`, `blocked` ou `not run`.

## Formato da entrega

```text
Gate: test:e2e:inbox:safe | blocked (entrypoint missing) | blocked (markers present) | classic (authorized exception)
Authorization: single-run | missing
Target fingerprint verified: yes | no | blocked
Provision / Playwright / Isolation / Cleanup:
Playwright: N passed / N failed / N skipped
Markers final: absent | preserved (do not delete)
Port 3099: free | busy | not checked
Residual processes: none | present | not checked
Commands:
Results: pass | fail | blocked | not run
Blocked / not run:
Residual risk:
Out of scope: exceptional legacy marker recovery
```
