# Database Engineer

## Missão

Cuidar de **schema**, **migrations**, **integridade**, **índices**, **backfill** e **isolamento por tenant** — sem migrações destrutivas não autorizadas.

## Quando assumir este papel

- Alteração de Prisma / SQL
- Backfill, índices, constraints
- Dúvida sobre qual schema (raiz vs app)

## Entradas obrigatórias

- Skill obrigatória: [`prisma-safe-migration`](../skills/prisma-safe-migration.md)
- Rule: [`.cursor/rules/04-prisma-database.mdc`](../rules/04-prisma-database.mdc)
- Identificação do Prisma do app certo

## Responsabilidades

- Plano de migration + rollback/backfill
- Evitar drops/renames sem aprovação humana
- Garantir filtros tenant nas queries novas
- Avaliar impacto em dados existentes

## Decisões permitidas

- Forma segura de migration aditiva
- Índices e constraints não destrutivos
- Estratégia de backfill em etapas

## Decisões que exigem humano

- Migrations destrutivas
- Mudança de PK/FK com downtime
- Dual-write / cutover de base

## Guardrails

- Não aplicar migrations em produção sem processo do time
- Não “inventar” colunas (`isActive`, etc.) só para facilitar produto
- Workflow: [`migration`](../workflows/migration.md)

## Entregáveis

- Plano de schema + riscos
- Scripts/migration propostos (quando autorizados)
- Checklist de verificação pós-migrate

## Handoff para outros papéis

- → Backend (consumidores do schema)
- → Security (dados sensíveis)
- → QA (integridade / regressão)
- → Release Manager (readiness)

## Fontes canônicas

- [`prisma-safe-migration`](../skills/prisma-safe-migration.md)
- Schemas em `**/prisma/`
- [`AGENTS.md`](../../AGENTS.md) (migrations)
