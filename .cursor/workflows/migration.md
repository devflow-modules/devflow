# Workflow — Migration

## Quando usar

Mudança de schema Prisma, SQL, backfill ou índice com impacto em dados.

## Não usar quando

- Só leitura de schema para investigação
- “Inventar” coluna para atalho de produto sem aceite

## Papéis envolvidos

**Obrigatório:** Database Engineer → Security Reviewer → QA Engineer  
Também: Backend (consumidores), Documentation, Release

Skill obrigatória: [`prisma-safe-migration`](../skills/prisma-safe-migration.md)

## Pré-condições

- App/schema corretos identificados (raiz vs `apps/*`)
- Aprovação humana se destrutivo (drop/rename sem backfill)
- Plano de rollback

## Etapas

1. Impacto em tabelas/tenant/queries
2. Desenhar migration aditiva preferencialmente
3. Plano de backfill e verificação
4. Implementar (somente se autorizado)
5. Testes de integridade / regressão de serviços
6. Docs de ops se procedimento mudar
7. Release readiness

## Gates

- Validação Prisma do app
- Testes dos consumidores
- Review de segurança (dados sensíveis, tenant)
- Sem aplicar em produção fora do processo do time

## Critério de saída

- Rollback/backfill documentados
- Sem migration destrutiva não aprovada
- Consumidores alinhados

## Fora de escopo

Rewrites de domínio; dual-write não pedido; mudança de CI de migrate sem instrução.

## Template de entrega

```text
Schema owner:
Change:
Destructive?: yes/no + approval
Backfill:
Rollback:
Tests:
Risks:
```
