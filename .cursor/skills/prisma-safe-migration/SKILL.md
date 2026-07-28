---
name: prisma-safe-migration
description: >-
  Orienta mudanças seguras em schema, migrations, índices e dados Prisma no
  monorepo. Use ao alterar modelos, planejar backfills ou analisar impacto em
  qualquer schema.prisma do DevFlow.
---

# Prisma — migration segura

## Objetivo

Planejar e, quando autorizado, implementar mudanças aditivas de dados com owner, isolamento por tenant, rollout e rollback explícitos. Capacidade: `action-enabled com aprovação`.

## Gatilhos de uso

- Mudança em `schema.prisma`.
- Criação ou revisão de migration, índice ou constraint.
- Backfill, dual-read/dual-write ou mudança de formato persistido.
- Investigação de impacto em consumidores de um modelo.

## Entradas obrigatórias

- Schema owner confirmado: raiz, `apps/whatsapp-platform`, `apps/financeiro` ou outro owner real.
- Critério de aceite e consumidores afetados.
- Volume/estado conhecido dos dados e necessidade de downtime.
- Plano de rollout, verificação e rollback.
- Aprovação humana explícita para operação destrutiva ou criação de migration quando não estiver claramente pedida.
- [`AGENTS.md`](../../../AGENTS.md) e [rule de Prisma](../../rules/04-prisma-database.mdc).

## Fluxo operacional

1. Inspecionar schema, migrations recentes, queries, relações de tenant e índices existentes.
2. Descrever impacto em dados, consumidores, compatibilidade e isolamento.
3. Preferir expansão aditiva: coluna nullable/default seguro, tabela ou índice novo.
4. Separar expansão, backfill, mudança de leitura/escrita e remoção em etapas reversíveis.
5. Reproduzir bugs de persistência e adicionar regressão antes da correção.
6. Implementar apenas as etapas autorizadas no schema correto.
7. Atualizar consumidores, testes e documentação necessária.
8. Validar geração/schema e testes direcionados sem aplicar em produção.

## Guardrails

- Nunca executar `migrate reset`, `DROP`, `TRUNCATE` ou escrita em banco compartilhado/produção.
- Não renomear ou remover coluna sem compatibilidade, backfill e aprovação explícita.
- Não criar arquivo em `prisma/migrations/` salvo quando a tarefa autorizar.
- Não enfraquecer constraints ou filtros que sustentem isolamento por tenant.
- Não usar dados reais de cliente em testes, logs ou relatórios.
- Índices devem corresponder a queries observadas; evitar duplicação sem evidência.

## Stop conditions

Parar antes de editar ou executar quando:

- o schema owner estiver ambíguo;
- faltar aprovação para ação destrutiva ou migration;
- não houver plano seguro de backfill/rollback;
- a mudança puder bloquear tabela relevante sem avaliação operacional;
- o ambiente apontar para banco compartilhado ou produção;
- a regra de produto ou retenção de dados não estiver definida.

## Validações

- Gerar/validar o Prisma Client com o comando do owner.
- Inspecionar SQL gerado quando houver migration autorizada.
- Executar testes dos repositórios e serviços consumidores, incluindo tenant.
- Documentar contagens ou invariantes de backfill sem expor dados.
- Registrar downtime esperado e estratégia de rollback.
- Marcar validações como `pass`, `fail`, `blocked` ou `not run`.

## Formato da entrega

```text
Schema owner:
Data change:
Consumers:
Tenant impact:
Destructive: yes | no
Approval:
Rollout / backfill:
Rollback:
Validations:
Blocked / not run:
Residual risks:
```
