# Skills DevFlow

Catálogo e contrato de governança das skills versionadas do monorepo. Skills ensinam técnicas; não substituem código, documentação canônica, `AGENTS.md`, rules, revisão humana ou CI.

## Contrato obrigatório

Cada skill fica em `.cursor/skills/<name>/SKILL.md` e contém:

1. frontmatter com `name` e `description`;
2. objetivo;
3. gatilhos de uso;
4. entradas obrigatórias;
5. fluxo operacional;
6. guardrails;
7. stop conditions;
8. validações;
9. formato da entrega.

O `name` deve coincidir com o diretório, usar apenas letras minúsculas, números e hífens e ter no máximo 64 caracteres. A `description` deve dizer o que a skill faz e quando deve ser usada. Referências devem usar caminhos relativos com `/`.

## Catálogo

| Skill | Tipo | Capacidade | Uso principal |
|---|---|---|---|
| [`whatsapp-platform-safe-change`](./whatsapp-platform-safe-change/SKILL.md) | domínio | action-enabled | Mudanças autorizadas no runtime canônico do WhatsApp |
| [`prisma-safe-migration`](./prisma-safe-migration/SKILL.md) | técnica | action-enabled com aprovação | Schema, migrations, índices e backfills Prisma |
| [`test-hardening`](./test-hardening/SKILL.md) | técnica | action-enabled | Regressão, cobertura e flakiness em Vitest |
| [`nextjs-ui-polish`](./nextjs-ui-polish/SKILL.md) | técnica | action-enabled | Ajustes visuais sem alterar contratos de produto |
| [`devflow-github-issue`](./devflow-github-issue/SKILL.md) | operação externa | action-enabled com autorização | Preparação e criação de issues no GitHub |
| [`product-grill`](./product-grill/SKILL.md) | decisão | advisory-only | Validação de problema, evidência e MVP |
| [`revenue-centric-design`](./revenue-centric-design/SKILL.md) | decisão | advisory-only | Priorização por outcomes, custo e risco |

`action-enabled` permite editar ou executar ações apenas quando o pedido do usuário autorizar. `action-enabled com aprovação` também exige a aprovação indicada pela própria skill. `advisory-only` produz análise e recomendações, sem autorizar implementação ou escrita externa.

## Relação com a orquestração

```text
AGENTS.md + rules + contratos reais
→ workflow coordena etapas e gates
→ agent define o papel responsável
→ skill fornece a técnica
→ command oferece uma entrada reutilizável
→ revisão humana + CI validam a entrega
```

| Skill | Agents relacionados | Workflows relacionados | Commands relacionados |
|---|---|---|---|
| `whatsapp-platform-safe-change` | Platform Architect, Backend Engineer | feature, bugfix, audit-hardening | `/map-impact`, `/audit-domain` |
| `prisma-safe-migration` | Database Engineer, Security Reviewer | migration | `/map-impact`, `/review-pr` |
| `test-hardening` | QA Engineer | feature, bugfix, audit-hardening | `/create-tests`, `/fix-ci` |
| `nextjs-ui-polish` | Frontend Engineer, QA Engineer | feature, bugfix | `/create-tests`, `/review-pr` |
| `devflow-github-issue` | Product Owner, Platform Architect | qualquer workflow após triagem | `/plan-feature`, `/map-impact` |
| `product-grill` | Product Owner | product-validation | `/validate-product` |
| `revenue-centric-design` | Product Owner | product-validation | `/validate-product` |

A precedência completa está em [`.cursor/README.md`](../README.md). Em conflito, a skill para e segue a fonte de maior autoridade.

## Criação e revisão

1. Confirmar que a necessidade não pertence a uma rule, agent, command, workflow ou documentação canônica.
2. Criar uma pasta com `SKILL.md` usando o contrato obrigatório.
3. Classificar a capacidade como `advisory-only`, `action-enabled` ou `action-enabled com aprovação`.
4. Manter orientação geral em `AGENTS.md` ou rules; deixar na skill apenas a técnica e os procedimentos específicos.
5. Revisar permissões, comandos destrutivos, escrita externa, ambientes, secrets, PII, tenant, auth, billing e migrations.
6. Atualizar este catálogo e todos os consumidores da skill no mesmo PR.
7. Executar `node .cursor/skills/validate-skills.mjs`.

Mudanças de comportamento ou guardrails exigem revisão humana e devem ser descritas no PR. Renomes ou remoções são breaking changes da camada de orquestração: atualizar referências no mesmo PR e registrar a migração. O histórico Git é o versionamento; não duplicar número de versão no frontmatter.

## Critérios de aceite

- Validador local aprovado.
- Links e caminhos relativos válidos.
- Frontmatter consistente e nomes únicos.
- Nenhum arquivo legado `.cursor/skills/*.md`, exceto este `README.md`.
- Nenhuma instrução contradiz `AGENTS.md`, rules de segurança ou documentação canônica.
- Nenhum secret, dado real de cliente ou comando destrutivo sem aprovação explícita.
- Capacidade de ação e stop conditions explícitas.
