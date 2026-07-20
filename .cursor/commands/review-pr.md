# /review-pr

## Objetivo

Revisão estruturada de PR (humana ou agente em modo review-only).

## Entradas

- Diff / URL do PR
- Workflow de origem (feature, bugfix, audit-hardening)

## Processo

Rever checklist:

```text
scope
contract
security
tenant
concurrency
idempotency
side effects (no-op?)
tests
docs
CI honesty
regressions
alternative paths
```

Papéis: Security + QA + Architect conforme risco. Ver também [`CURSOR_AUTOMATIONS.md`](../../docs/operations/CURSOR_AUTOMATIONS.md).

## Saída obrigatória

Findings por severidade + veredito (`safe` / `safe with follow-up` / `block`) + follow-ups.

## Restrições

- Em review-only: não editar nem mergear
- Não aprovar com skipped apresentados como pass
