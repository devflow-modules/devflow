# /create-tests

## Objetivo

Plano (e, se autorizado, implementação) de testes por risco.

## Entradas

- Diff ou domínio
- Aceite / gaps confirmados

## Processo

1. Papel QA ([`../agents/qa-engineer.md`](../agents/qa-engineer.md))
2. Skill [`test-hardening`](../skills/test-hardening.md)
3. Cobrir matriz:

```text
unit | service | route | UI | E2E
concurrency | idempotency | tenant
```

4. Preferir testes vizinhos ao módulo alterado

## Saída obrigatória

- Plano por risco
- Comandos `pnpm` concretos do app
- O que fica skipped por ambiente

## Restrições

- Skipped ≠ passed
- Não enfraquecer asserts
- Não exigir suite monorepo inteira sem necessidade
