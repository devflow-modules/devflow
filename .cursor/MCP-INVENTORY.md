# Inventário MCP (pré-edição)

## Existing MCP configuration

- Nenhum `.cursor/mcp.json` no monorepo DevFlow
- Docs Career Suite (`docs/career-suite/integrations/*`, ADR-006) descrevem MCP de lab — **fora** desta fundação Cursor de desenvolvimento
- Sem configuração global versionada

## Native Cursor capabilities already available

- Filesystem / leitura-escrita no workspace
- Terminal / Git local
- Rules, skills, agents, workflows, commands (PR #146)
- Browser/automation nativos do produto (quando habilitados) — não substituem Playwright MCP isolado nem E2E versionado

## External systems useful to the workflow

- GitHub (PRs, issues, Actions) — evidência remota
- Supabase (schema/docs em ambientes de desenvolvimento) — múltiplos projetos no monorepo
- Playwright (UI local autenticada) — investigação visual/a11y
- Stripe / Meta WhatsApp Cloud — **não** nesta fase

## Secrets required

| Integração | Segredo | Onde |
|------------|---------|------|
| GitHub | PAT (mínimo escopo) | `~/.cursor/mcp.json` / UI Cursor — **nunca** Git |
| Supabase | OAuth dinâmico (preferido) ou token CI | local/global — **nunca** Git |
| Playwright | nenhum para local isolado | — |

## Write-capable operations

- GitHub: mutations de issue/PR/Actions/dispatch — **desabilitadas** no modo fundação
- Supabase: DDL, migrations, Edge deploy, storage write, account — **desabilitadas** (`read_only` + features limitadas)
- Playwright: navegação local — sem persistir storage state no Git

## Production exposure risk

- Alto se Supabase/GitHub apontarem para produção com write
- Mitigação: read-only, project-scoped (dev), sem Stripe/Meta, sem Postgres genérico a prod

## Recommended MCPs

1. Playwright oficial (`@playwright/mcp`) — projeto, `--isolated`
2. GitHub oficial (hosted ou Docker) — global, read-only + toolsets mínimos
3. Supabase oficial (hosted URL) — example local, project-scoped + read_only + features=database,docs

## Rejected/deferred MCPs

- Filesystem / Git genérico
- Stripe, Meta/WhatsApp Cloud
- PostgreSQL genérico (produção)
- `@modelcontextprotocol/server-github` (legado)
- Comunitários não oficiais sem review

## Files to create/update

- `.cursor/MCP.md`, `.cursor/mcp.json`, `.cursor/examples/*`, `.cursor/commands/audit-mcp.md`
- Updates: README, agents (architect/security/qa/release), workflows (audit-hardening, fix-ci via command, product-validation)
- `.gitignore` se necessário para artefatos MCP locais
- Inventário deste ficheiro
