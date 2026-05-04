---
name: prisma-safe-migration
description: >-
  Trabalho seguro com Prisma (schema, migrations, dados) no monorepo DevFlow
  Labs. Usar quando o utilizador pedir mudanças de modelo, migrations, ou
  análise de impacto em bases na raiz ou em apps/*.
---

# Prisma — schema e migrations seguros

Leia [`AGENTS.md`](../../AGENTS.md) e `.cursor/rules/04-prisma-database.mdc`. Confirmar **qual** `schema.prisma` aplica (raiz vs `apps/whatsapp-platform/prisma` vs `apps/financeiro/prisma`).

## Instruções

1. **Inspeccionar** migrations recentes, modelos com `tenantId` / organização e índices usados pelas queries do serviço antes de propor mudanças.
2. **Sem migrações destrutivas** (`DROP`, `TRUNCATE`, rename sem backfill) **sem aprovação explícita** humana; documentar impacto em dados existentes.
3. **Preferir alterações aditivas** (novas colunas nullable ou com default seguro, novas tabelas) em vez de remover ou renomear à pressa.
4. **Tenant** — novas relações ou colunas sensíveis devem manter ou reforçar isolamento; rever filtros em serviços que consomem o modelo.
5. **Índices** — alinhar a padrões de query existentes; evitar índices redundantes ou que bloqueiem escritas sem ganho.
6. **Rollback** — descrever como reverter (revert migration, feature flag, ou plano de dados) antes de merge em ramos partilhados.
7. Quando relevante, **actualizar** testes, seeds de desenvolvimento e documentação curta do modelo (sem duplicar runbooks completos).

## Expectativas de validação

- Explicar em texto curto: **o que muda para os dados**, **downtime percebido** (se houver), e **como validar** (migrate deploy em staging, contagem de linhas, testes Vitest que tocam no repositório).

## Não fazer

- Não aplicar `migrate reset` em bases partilhadas ou produção.
- Não remover colunas em uso sem plano de migração de dados e aprovação.
- Não criar ficheiros em `prisma/migrations/` **a menos que** a tarefa o exija explicitamente.
- Não enfraquecer constraints que suportem isolamento multi-tenant.

## Princípios gerais

- **Diffs pequenos** por etapa (schema → código consumidor → testes).
- Para triagem de PR, considerar `needs:migration-review` segundo [`docs/operations/GITHUB_LABELS.md`](../../docs/operations/GITHUB_LABELS.md).
