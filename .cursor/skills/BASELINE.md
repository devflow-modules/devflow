# Internal skills baseline — frozen

Data de congelamento da fundação interna: **2026-07-28** (13 skills).
Primeira extensão externa adaptada (decisão explícita): **2026-07-28** — `frontend-design` (piloto ADAPT).

Este ficheiro é a **referência controlada** do inventário confiável de skills DevFlow. Não atualizar automaticamente. Qualquer mudança de contagem, contrato ou capacidade exige **decisão humana explícita** e PR dedicado que altere este ficheiro de propósito.

## Contagem

| Item | Valor |
|---|---|
| Skills validadas | **14** |
| Fundação interna (freeze) | **13** |
| Externas adaptadas | **1** (`frontend-design`) |
| Validador | `node .cursor/skills/validate-skills.mjs` |
| Layout | `.cursor/skills/<name>/SKILL.md` |
| Contrato | objetivo, gatilhos, entradas, fluxo, guardrails, stop conditions, validações, formato da entrega |

## Inventário — fundação interna (imutável salvo decisão)

| Skill | Capacidade | Papel |
|---|---|---|
| `whatsapp-platform-safe-change` | action-enabled | Mudança segura no runtime WhatsApp |
| `whatsapp-e2e-safe-gate` | action-enabled com aprovação | Gate E2E inbox seguro |
| `whatsapp-client-onboarding` | action-enabled com aprovação | Gate onboarding cliente Meta |
| `devflow-multitenancy-review` | action-enabled (default review-only) | Isolamento multi-tenant |
| `devflow-safe-release` | action-enabled com aprovação | Readiness/release |
| `devflow-incident-diagnostics` | action-enabled com aprovação | Diagnóstico de incidentes |
| `devflow-product-evidence` | advisory-only | Evidência acionável pós-experimento |
| `prisma-safe-migration` | action-enabled com aprovação | Prisma/migrations |
| `test-hardening` | action-enabled | Vitest/regressão |
| `nextjs-ui-polish` | action-enabled | Polish UI sem contratos |
| `devflow-github-issue` | action-enabled com autorização | Issues GitHub |
| `product-grill` | advisory-only | Validação pré-build |
| `revenue-centric-design` | advisory-only | Priorização por outcomes |

## Inventário — externas adaptadas (decisão explícita)

| Skill | Decisão | Origem | Quarentena / auditoria |
|---|---|---|---|
| `frontend-design` | **ADAPT** (piloto 2026-07-28) | Anthropic `anthropics/skills` · Apache 2.0 | [AUDIT.md](../external-skills/quarantine/frontend-design/AUDIT.md) |

## Auditoria consolidada (aceite da fundação interna)

- [x] Formato `SKILL.md` em pasta; sem legado `.cursor/skills/*.md` (exceto `README.md` / este baseline).
- [x] Frontmatter `name` + `description`; `name` = diretório.
- [x] Secções obrigatórias do contrato presentes (validador).
- [x] Capacidade explícita; actions vs advisory separados.
- [x] Stop conditions / `BLOCK` quando faltam entrypoint, evidência ou autorização (skills operacionais).
- [x] Sem secrets, PII ou comandos destrutivos sem aprovação.
- [x] Sem recovery excepcional de lock E2E legado como procedimento permanente.
- [x] Catálogo e mapa agents/workflows/commands em [`README.md`](./README.md).
- [x] Precedência: código/contratos → docs → `AGENTS.md` → rules → workflows → agents → skills → commands.

## Imutabilidade

- A fundação interna de 13 **não** muda por importação automática, Dependabot ou cópia de skill externa.
- Editar este ficheiro só quando a equipa decidir explicitamente alterar o inventário.
- Skills internas podem receber correções pontuais via PR pequeno **sem** reescrever a baseline, desde que contagem/contrato/capacidade permaneçam iguais; se mudarem, atualizar este ficheiro no mesmo PR.
- Externas adaptadas entram **uma por PR**, com quarentena + auditoria; nunca `npx skills add` direto no catálogo confiável.

## Intake de skills externas

```text
quarentena
→ auditoria de origem/licença
→ análise de segurança
→ adaptação ao contrato DevFlow
→ validação (validate-skills.mjs)
→ PR isolada
```

Regras:

1. Snapshot verbatim fora de `.cursor/skills/<name>/` confiável até a adaptação.
2. Distinguir **importado** vs **autoria DevFlow** (origem, licença, hash, URL).
3. Bloquear comandos, fallbacks ou permissões não documentadas; entrypoint ausente → `BLOCK`.
4. Exigir **ganho claro** sobre o inventário atual; rejeitar duplicação sem benefício.
5. Segurança: sem secrets, PII, production write implícito, ou bypass de rules/`AGENTS.md`.
6. Atualizar esta baseline **somente** por decisão explícita no PR de intake.

Próxima candidata (não iniciada): `mcp-builder` — após aplicação controlada de `frontend-design` numa tela real e medição de ganho.

## Como revalidar

```bash
node .cursor/skills/validate-skills.mjs
```

Esperado após este piloto: `OK: 14 skills validadas.`
