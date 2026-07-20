# Workflow — Release

## Quando usar

Preparar merge/release ou validar readiness de um PR crítico.

## Não usar quando

- Trabalho ainda em auditoria sem implementação
- Pedido só de notas sem verificar CI

## Papéis envolvidos

Release Manager (lead) + QA + Security (se risco) + Documentation

## Pré-condições

- Diff estável
- Gates locais ou CI executados
- Corpo do PR com riscos/deferred

## Etapas

```text
readiness checklist
→ CI (pass/fail/skip honestos)
→ release notes
→ rollback / smoke
→ decisão draft→ready→merge (humano)
→ validação pós-merge (quando aplicável)
```

## Gates

Os definidos pelo app e workflows CI do repositório. Não inventar “verde” sem log.

## Critério de saída

- Veredito de readiness
- Notas publicáveis
- Skipped listados
- Rollback conhecido

## Fora de escopo

Deploy automático não autorizado; bypass de checks.

## Template de entrega

```text
 readiness: go / no-go
CI summary:
Skipped:
Release notes:
Rollback:
Post-merge smoke:
```
