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

- **pnpm workspaces**: `apps/*` e `packages/*` (e **raiz** como app Next do **portal** em devflowlabs.com.br).
- **Turborepo**: orquestração de build, test e lint com cache.
- **Apps**: `site` (espelho parcial marketing), `financeiro` (produto), **`whatsapp-platform` (produto SaaS canónico)**, `investigamais`, `funklab`, `ops` (scaffolds ou produtos em evolução).
- **Packages compartilhados**: `billing-core`, `analytics-core`, `ui`, `auth-core`, `supabase-utils`, `config`, `whatsapp-core`, **`whatsapp-routes`**, **`financeiro-routes`**, `ai-core`, `testing-utils`.

Cada app pode ser implantado em projeto Vercel próprio. A **raiz** concentra o **portal** (marketing, ferramentas, Financeiro no domínio, cutover **308** para apps canónicos); produtos como WhatsApp operam no respetivo `apps/*`.

## Consequências

- **Positivas**: Deploy separado por produto, reuso via packages, limites claros entre apps e libs, base para novos produtos.
- **Negativas**: Mais pastas e configuração (tsconfig, next.config por app), necessidade de `packageManager` e lockfile único, builds e testes via turbo.
- **Riscos mitigados**: Admin/metrics do financeiro usa `force-dynamic` para não exigir DATABASE_URL em build; scaffolds usam CSS e middleware mínimos para build sem deps de produto.

## Referências

- Plano de migração (monorepo).
- `ARCHITECTURE.md` na raiz.
- `pnpm-workspace.yaml`, `turbo.json`, `package.json` (scripts `build:workspace`, `test:workspace`, `lint:workspace`).
