# Inventário pré-orquestração (snapshot)

Gerado antes da criação de agents/workflows/commands. Não substitui fontes canônicas.

## Existing constitution

- `AGENTS.md` — constituição geral do monorepo (comportamento, migrations, testes, UI, fora de âmbito)

## Existing rules (`.cursor/rules/`)

| Rule | Escopo |
|------|--------|
| `00-devflow-architecture.mdc` | always — boundaries apps/packages, portal, cutover |
| `01-security-and-secrets.mdc` | always — secrets, tenant, auth, billing, webhooks |
| `02-testing-quality-gates.mdc` | always — testes direcionados, contratos, PRs pequenos |
| `03-nextjs-app-router.mdc` | globs Next/UI |
| `04-prisma-database.mdc` | globs Prisma |
| `05-whatsapp-platform.mdc` | globs WhatsApp Platform + packages relacionados |
| `06-healthsafe-rpa.mdc` | globs HealthSafe/RPA docs |
| `whatsapp-platform-design.mdc` | globs UI/CSS WhatsApp Platform |

## Existing skills (`.cursor/skills/`)

| Skill | Função |
|-------|--------|
| `whatsapp-platform-safe-change.md` | mapa de impacto + gates WhatsApp |
| `prisma-safe-migration.md` | migrations Prisma seguras |
| `test-hardening.md` | fortalecer testes Vitest |
| `nextjs-ui-polish.md` | polish UI sem mudar negócio |
| `devflow-github-issue.md` | issues bem delimitadas |

## Existing automation docs

- `docs/operations/CURSOR_AUTOMATIONS.md` — review-only (sem commits automáticos)
- `docs/operations/REDIRECT_SAFETY.md`
- Governance WhatsApp: `docs/whatsapp-platform/{DOCUMENTATION-MAP,CURRENT-SCOPE,ARCHITECTURE}.md`
- Routing: `docs/architecture/ROUTING_POLICY.md`, `docs/site/MATRIZ-DECISAO-ROTAS.md`, `src/lib/routing-governance.ts`

## Missing orchestration layers (antes desta PR)

- `.cursor/README.md`
- `.cursor/agents/`
- `.cursor/workflows/`
- `.cursor/commands/`
- skills de produto (`product-grill`, `revenue-centric-design`)
- relação formal AGENTS ↔ rules ↔ skills ↔ agents ↔ workflows ↔ commands ↔ docs ↔ CI

## Potential duplication risks

- Reescrever gates WhatsApp já em `05-whatsapp-platform.mdc` / `whatsapp-platform-safe-change.md`
- Duplicar CURRENT-SCOPE / ARCHITECTURE
- Criar “agents” que pareçam runtime (confundir com Career Suite agents em `docs/career-suite/agents/`)
- Expandir `AGENTS.md` para índice gigante

## Canonical sources to reference

- `AGENTS.md`, `ARCHITECTURE.md`, `docs/README.md`
- `.cursor/rules/*`, `.cursor/skills/*`
- `docs/whatsapp-platform/*`, `apps/whatsapp-platform/docs/`
- `docs/architecture/PLATFORM-STANDARD.md`, `ROUTING_POLICY.md`
- `docs/operations/CURSOR_AUTOMATIONS.md`

## Files that must not be duplicated

- Rules existentes (não copiar conteúdo; linkar)
- Skills técnicas existentes
- CURRENT-SCOPE / ARCHITECTURE WhatsApp
- Scripts CI e workflows GitHub Actions
- Contratos de produto em código
