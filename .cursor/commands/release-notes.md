# /release-notes

## Objetivo

Gerar notas de release/PR honestas.

## Entradas

- Diff / commits / corpo do PR
- Resultados de testes

## Processo

Papel Release Manager + Documentation. Workflow [`release`](../workflows/release.md).

## Saída obrigatória

```text
Features:
Fixes:
Security:
Tests:
Migrations:
Breaking changes:
Deferred:
```

Incluir skipped relevantes.

## Restrições

- Não inventar capacidades não entregues
- Não omitir breaking changes
