---
name: whatsapp-e2e-safe-gate
description: >-
  Executa o gate E2E seguro da inbox WhatsApp com provisionamento efêmero,
  fingerprint do alvo, isolamento de rede e cleanup por recibo. Use ao validar
  inbox E2E sem credenciais manuais permanentes nem ambientes compartilhados.
---

# WhatsApp — E2E inbox safe gate

## Objetivo

Correr o ciclo comprovado `test:e2e:inbox:safe` em `apps/whatsapp-platform`: provisionar tenant/manager efêmeros, subir Next local isolado, executar `tests/e2e/inbox.spec.ts` em safe mode e limpar somente pelos IDs do recibo. Capacidade: `action-enabled com aprovação` (acesso a banco WhatsApp não-prod + cleanup).

## Gatilhos de uso

- Validar regressão de inbox com E2E após mudança no app WhatsApp.
- Preferir o gate seguro em vez de `pnpm test:e2e:inbox` com credenciais admin manuais.
- Reproduzir falha de inbox E2E em ambiente local controlado.

Não usar para smoke de produção, Meta Cloud real, billing Stripe live, nem para “recuperar” lock/recibo legado.

## Entradas obrigatórias

- Autorização explícita para tocar no banco WhatsApp **não-prod** indicado pelas envs locais.
- Working directory: `apps/whatsapp-platform`.
- Entrypoint presente: script `test:e2e:inbox:safe` em [`package.json`](../../../apps/whatsapp-platform/package.json) apontando para `scripts/e2e/run-inbox-e2e.ts`.
- Datasource local resolvível via `WHATSAPP_DIRECT_URL` (preferida) ou `WHATSAPP_DATABASE_URL` — **nunca** colar valores no chat, issue ou skill.
- Markers ausentes antes de iniciar:
  - `tests/.auth/inbox-e2e-fixture.lock`
  - `tests/.auth/inbox-e2e-fixture.json`
- Contexto: [`AGENTS.md`](../../../AGENTS.md), [quality gates](../../rules/02-testing-quality-gates.mdc), [WhatsApp rule](../../rules/05-whatsapp-platform.mdc), [`ARCHITECTURE.md`](../../../docs/whatsapp-platform/ARCHITECTURE.md), [`TESTING.md`](../../../apps/whatsapp-platform/docs/TESTING.md).
- Skills relacionadas: [`whatsapp-platform-safe-change`](../whatsapp-platform-safe-change/SKILL.md), [`test-hardening`](../test-hardening/SKILL.md).

## Fluxo operacional

1. Confirmar que o entrypoint safe existe. Se ausente → `blocked` e parar (não improvisar com o gate clássico sem autorização).
2. Confirmar alvo não-prod e markers ausentes. Não apagar lock/recibo existentes sem decisão humana.
3. Executar o ciclo canônico:

   ```bash
   cd apps/whatsapp-platform
   pnpm test:e2e:inbox:safe
   ```

4. O orquestrador (`scripts/e2e/run-inbox-e2e.ts`) deve, nesta ordem:
   - resolver env + fingerprint do alvo (host/port/db/user hashed; sem password);
   - adquirir lock exclusivo;
   - verificar fingerprint em provision → execution → cleanup;
   - provisionar tenant+manager **novos** (nunca adotar entidades existentes / DevFlow Sales);
   - gravar recibo atômico e vincular `runId` + digest no lock;
   - preparar artefatos em `tests/.auth/inbox-safe/`;
   - subir Next em `http://127.0.0.1:3099` e aguardar readiness em `/login`;
   - correr Playwright em `tests/e2e/inbox.spec.ts` com `INBOX_E2E_SAFE_MODE=1`, storage state controlado e allowlist de rede;
   - parar Playwright e Next;
   - exigir relatório de isolamento aprovado e artefatos removidos;
   - cleanup DB **somente** pelos IDs do recibo; remover recibo; liberar lock.
5. Se o ciclo abortar com `InboxMarkerPreservationError` (recibo/lock preservados), **não** apagar markers. Reportar estado e pedir decisão humana.
6. Cleanup standalone (`tsx scripts/e2e/cleanup-inbox-e2e.ts`) só quando houver recibo válido, fingerprint consistente e autorização explícita — nunca como atalho para lock órfão.

Gate clássico (`pnpm test:e2e:inbox`) exige `E2E_WHATSAPP_ADMIN_EMAIL` / `E2E_WHATSAPP_ADMIN_PASSWORD` manuais e **não** substitui o safe gate.

## Guardrails

- Nunca apontar o gate para produção ou banco compartilhado sem decisão humana explícita.
- Nunca logar, colar ou commitar passwords, `DATABASE_URL` completa, storage state ou PII.
- Nunca adotar tenant/usuário existente; o fixture deve ser efêmero e criado pelo provisionador.
- Nunca apagar `inbox-e2e-fixture.lock` / `.json` “para destravar” sem verificação do recibo e autorização.
- Nunca implementar, documentar ou invocar recovery de lock legado PID-only, heurísticas de vínculo unprovable, ou flags do tipo `--recover-legacy-pid-lock` / `--accept-unprovable-legacy-link` como procedimento desta skill.
- Nunca tratar teste skipped ou ciclo com markers preservados como sucesso.
- Não misturar Meta Cloud real, Stripe live ou dados de cliente neste gate.

## Stop conditions

Parar e escalar para humano quando:

- `test:e2e:inbox:safe` / `scripts/e2e/run-inbox-e2e.ts` não existir no tree atual;
- faltar `WHATSAPP_DIRECT_URL` / `WHATSAPP_DATABASE_URL` ou o alvo parecer produção/shared;
- fingerprint divergir entre etapas;
- lock ou recibo já estiverem ativos / concorrentes;
- lock existir sem `runId`+digest vinculados ao recibo (formato legado ou órfão);
- isolamento de rede/artefatos não for aprovado;
- cleanup ficar incompleto (recibo permanece) ou shutdown de processos não for comprovado;
- for pedido recovery excepcional de markers legados — **fora do escopo permanente desta skill**.

## Validações

- Entrypoint e working directory corretos.
- Comando executado (ou `blocked`/`not run` justificado).
- Fingerprint verificado nas três etapas quando o ciclo completar.
- Playwright/inbox: `pass` | `fail` | `blocked` | `not run`.
- Isolamento: relatório aprovado ou falha explícita.
- Markers finais: ausentes após sucesso; preservados após aborto seguro.
- Nenhum secret/PII no relatório.
- Classificar cada validação como `pass`, `fail`, `blocked` ou `not run`.

## Formato da entrega

```text
Gate: test:e2e:inbox:safe | blocked (entrypoint missing) | classic (authorized exception)
Target fingerprint verified: yes | no | blocked
Provision / Playwright / Isolation / Cleanup:
Markers final: absent | preserved (do not delete)
Commands:
Results: pass | fail | blocked | not run
Blocked / not run:
Residual risk:
```
