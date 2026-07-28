# Internal skills baseline — frozen

Data de congelamento: **2026-07-28**.

Este ficheiro congela a **fundação interna** de skills DevFlow após a conclusão do catálogo planejado. Skills externas só entram depois, em quarentena e **uma por PR**.

## Contagem

| Item | Valor |
|---|---|
| Skills validadas | **13** |
| Validador | `node .cursor/skills/validate-skills.mjs` |
| Layout | `.cursor/skills/<name>/SKILL.md` |
| Contrato | objetivo, gatilhos, entradas, fluxo, guardrails, stop conditions, validações, formato da entrega |

## Inventário (baseline)

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

## Auditoria consolidada (aceite da baseline)

- [x] Formato `SKILL.md` em pasta; sem legado `.cursor/skills/*.md` (exceto `README.md` / este baseline).
- [x] Frontmatter `name` + `description`; `name` = diretório.
- [x] Secções obrigatórias do contrato presentes (validador).
- [x] Capacidade explícita; actions vs advisory separados.
- [x] Stop conditions / `BLOCK` quando faltam entrypoint, evidência ou autorização (skills operacionais).
- [x] Sem secrets, PII ou comandos destrutivos sem aprovação.
- [x] Sem recovery excepcional de lock E2E legado como procedimento permanente.
- [x] Catálogo e mapa agents/workflows/commands em [`README.md`](./README.md).
- [x] Precedência: código/contratos → docs → `AGENTS.md` → rules → workflows → agents → skills → commands.

## Fora da baseline (próxima fase)

- Skills externas / comunitárias: **quarentena**, uma por PR, `/audit`-style review, sem merge em lote.
- Alterações a skills da baseline: PR pequeno, atualizar este ficheiro se mudar contagem/contrato/capacidade.

## Como revalidar

```bash
node .cursor/skills/validate-skills.mjs
```

Esperado após este freeze: `OK: 13 skills validadas.`
