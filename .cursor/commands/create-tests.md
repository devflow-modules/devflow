# /create-tests

## Objetivo

Plano (e, se autorizado, implementação) de testes por risco.

## Entradas

- Diff ou domínio
- Aceite / gaps confirmados

## Processo

1. Papel QA ([`../agents/qa-engineer.md`](../agents/qa-engineer.md))
2. Skill [`test-hardening`](../skills/test-hardening/SKILL.md)
3. Se o domínio for inbox WhatsApp E2E: skill [`whatsapp-e2e-safe-gate`](../skills/whatsapp-e2e-safe-gate/SKILL.md)
4. Cobrir matriz:

```text
unit | service | route | UI | E2E
concurrency | idempotency | tenant
```

5. Preferir testes vizinhos ao módulo alterado

## Saída obrigatória

- Plano por risco
- Comandos `pnpm` concretos do app
- O que fica skipped por ambiente

## Restrições

- Skipped ≠ passed
- Não enfraquecer asserts
- Não exigir suite monorepo inteira sem necessidade
