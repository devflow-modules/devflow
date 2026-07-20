# AGENTS.md — DevFlow Labs

Este repositório é o **monorepo DevFlow Labs** (pnpm workspaces + Turborepo): portal na raiz (`src/`), produtos em `apps/*`, partilha em `packages/*`. Ver [`ARCHITECTURE.md`](ARCHITECTURE.md) e [`docs/README.md`](docs/README.md).

## Comportamento esperado do agente

1. **Alterações pequenas e revistas** — diffs focados, um tema por PR quando possível; evitar refactors amplos sem pedido explícito.
2. **Inspecionar padrões existentes** — antes de editar, ler ficheiros vizinhos, convenções do módulo e documentação de produto em `docs/` e `apps/<app>/docs/`.
3. **Produção SaaS** — respeitar auth (Supabase), billing (Stripe), **isolamento por tenant**, trilhos de auditoria e webhooks (Meta, Stripe); nunca expor segredos em logs, issues ou código versionado.
4. **Migrations** — não propor nem aplicar migrações **destrutivas** (drops, renames sem backfill) sem **aprovação explícita** humana; alinhar com o schema Prisma do app certo (raiz vs `apps/whatsapp-platform` vs `apps/financeiro`).
5. **Testes** — correr e estender **testes direcionados** ao que mudou (Vitest); não depender só de suites completas do monorepo sem necessidade.
6. **UI** — manter **design system e tokens** (`packages/ui`, tokens por app — ex. `df-*` no WhatsApp Platform); não introduzir estilos ad hoc que quebrem o sistema visual.

## Regras Cursor

As regras em [`.cursor/rules/`](.cursor/rules/) detalham arquitetura, segurança, qualidade, Next.js, Prisma, WhatsApp e HealthSafe×RPA. O agente deve segui-las em conjunto com este ficheiro.

**Redirects e `next`:** não construir manualmente `login?next=`; usar os helpers documentados em [`docs/operations/REDIRECT_SAFETY.md`](docs/operations/REDIRECT_SAFETY.md).

**Automations Cursor (revisão):** runbook em [`docs/operations/CURSOR_AUTOMATIONS.md`](docs/operations/CURSOR_AUTOMATIONS.md) — v1 só em modo *review only* (sem commits automáticos).

## Orquestração Cursor

Índice operacional: [`.cursor/README.md`](.cursor/README.md).

Agents são papéis lógicos; workflows coordenam execução; commands são prompts reutilizáveis; skills ensinam técnicas específicas. Rules e contratos reais têm precedência.

## Fora de âmbito habitual do agente

Não alterar credenciais em `.env*`, não criar migrações nem alterar pipelines de CI sem instrução explícita do repositório ou da equipa.
