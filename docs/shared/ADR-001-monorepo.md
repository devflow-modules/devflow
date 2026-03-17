# ADR-001: Migração para monorepo

## Status

Aceito.

## Contexto

O repositório era uma única aplicação Next.js com rotas de marketing e de produto (Financeiro) no mesmo app. Isso dificultava:

- Deploy e domínios independentes (portal vs produto).
- Reuso de código entre produtos futuros (Investiga+, FunkLab, WhatsApp Platform, Ops).
- Isolamento de responsabilidades e dependências (ex.: billing, analytics).

## Decisão

Migrar para um **monorepo** com:

- **pnpm workspaces**: `apps/*` e `packages/*` (e raiz como app legado).
- **Turborepo**: orquestração de build, test e lint com cache.
- **Apps**: `site` (marketing), `financeiro` (produto atual), e scaffolds para `investigamais`, `funklab`, `whatsapp-platform`, `ops`.
- **Packages compartilhados**: `billing-core`, `analytics-core`, `ui`, `auth-core`, `supabase-utils`, `config`, `whatsapp-core`, `ai-core`, `testing-utils`.

Cada app pode ser implantado em projeto Vercel próprio. A raiz do repo mantém o app “full” (site + produto) para compatibilidade e deploy atual.

## Consequências

- **Positivas**: Deploy separado por produto, reuso via packages, limites claros entre apps e libs, base para novos produtos.
- **Negativas**: Mais pastas e configuração (tsconfig, next.config por app), necessidade de `packageManager` e lockfile único, builds e testes via turbo.
- **Riscos mitigados**: Admin/metrics do financeiro usa `force-dynamic` para não exigir DATABASE_URL em build; scaffolds usam CSS e middleware mínimos para build sem deps de produto.

## Referências

- Plano de migração (monorepo).
- `ARCHITECTURE.md` na raiz.
- `pnpm-workspace.yaml`, `turbo.json`, `package.json` (scripts `build:workspace`, `test:workspace`, `lint:workspace`).
