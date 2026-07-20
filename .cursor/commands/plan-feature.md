# /plan-feature

## Objetivo

Produzir um plano de feature acionável antes de editar código.

## Entradas

- Pedido/issue
- Domínio suspeito (app)
- Restrições conhecidas

## Processo

1. Assumir papel Product Owner + Platform Architect ([`../workflows/feature.md`](../workflows/feature.md))
2. Ler CURRENT-SCOPE / ARCHITECTURE do domínio se existir
3. Correr mentalmente `/map-impact`
4. Definir etapas, aceite, testes, docs, riscos

## Saída obrigatória

```text
Problem:
Owner:
Architecture notes:
Steps:
Acceptance criteria:
Tests:
Docs:
Risks:
```

## Restrições

- Não implementar nesta etapa
- Não inventar owners ou capacidades fora do CURRENT-SCOPE
- Precedência: código/docs/rules > este command
