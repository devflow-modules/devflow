# Internal skills baseline — frozen

Data de congelamento: **2026-07-28**.  
Commit de referência na `main`: merge da fundação de 13 skills (`devflow-product-evidence` + este baseline).

Este ficheiro é a **referência imutável** da fundação interna de skills DevFlow. Não atualizar automaticamente. Qualquer mudança de contagem, contrato ou capacidade exige **decisão humana explícita** e PR dedicado que altere este ficheiro de propósito.

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

## Imutabilidade

- A baseline **não** muda por importação automática, Dependabot ou cópia de skill externa.
- Editar este ficheiro só quando a equipa decidir explicitamente alterar o inventário interno.
- Skills da baseline podem receber correções pontuais via PR pequeno **sem** reescrever a baseline, desde que contagem/contrato/capacidade permaneçam iguais; se mudarem, atualizar este ficheiro no mesmo PR.

## Intake de skills externas (pós-baseline)

Fluxo obrigatório — **uma skill externa por PR**; nunca copiar direto para o catálogo confiável:

```text
quarentena
→ auditoria de origem/licença
→ análise de segurança
→ adaptação ao contrato DevFlow
→ validação (validate-skills.mjs)
→ PR isolada
```

Regras:

1. Manter o material externo em quarentena (fora de `.cursor/skills/<name>/` confiável) até a PR de adaptação.
2. Distinguir claramente **conteúdo importado** vs **autoria interna** (origem, licença, data, URL).
3. Bloquear comandos, fallbacks ou permissões não documentadas; entrypoint ausente → `BLOCK`.
4. Exigir **ganho claro** sobre as 13 skills atuais; rejeitar duplicação/sobreposição sem benefício.
5. Segurança: sem secrets, PII, production write implícito, ou bypass de rules/`AGENTS.md`.
6. Atualizar esta baseline **somente** por decisão explícita após merge aceite — nunca como efeito colateral do import.

Próximo passo recomendado após este freeze: escolher **uma** candidata externa e submetê-la a auditoria piloto completa — não importar em lote.

## Como revalidar

```bash
node .cursor/skills/validate-skills.mjs
```

Esperado após este freeze: `OK: 13 skills validadas.`
