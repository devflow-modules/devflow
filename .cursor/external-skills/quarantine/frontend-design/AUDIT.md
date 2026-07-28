# External skill audit — frontend-design (piloto)

Decisão: **ADAPT**  
Data da auditoria: **2026-07-28**  
Branch: `chore/audit-external-frontend-design-skill`

## Origem

| Campo | Valor |
|---|---|
| Upstream | [anthropics/skills — frontend-design](https://github.com/anthropics/skills/tree/main/skills/frontend-design) |
| SKILL.md | https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md |
| LICENSE | https://github.com/anthropics/skills/blob/main/skills/frontend-design/LICENSE.txt |
| Upstream `main` SHA (consulta) | `b29e7cf65e5cb78a5ac33d582270551bc74a14eb` |
| Snapshot local | `.cursor/external-skills/quarantine/frontend-design/` |
| SKILL.md SHA-256 | `1608EA77FBB6FC30D13A97D12CFA8EBF31358D40F0DD97BEED24829D6B3F45DD` |
| LICENSE.txt SHA-256 | `0D542E0C8804E39AA7F37EB00DA5A762149DC682D7829451287E11B938E94594` |
| Licença | Apache License 2.0 |
| Autor upstream | Anthropic (skills repository) |
| Método de obtenção | Download HTTP do raw GitHub (sem `npx skills add`) |

## Separação de autoria

| Material | Classificação |
|---|---|
| Snapshot em `quarantine/frontend-design/{SKILL.md,LICENSE.txt}` | **Importado** (verbatim) |
| `.cursor/skills/frontend-design/SKILL.md` | **Derivado / autoria DevFlow** (adaptação ao contrato + guardrails) |
| `.cursor/skills/frontend-design/NOTICE.md` | **Atribuição** Apache 2.0 |

## Segurança

| Check | Resultado |
|---|---|
| Scripts / deps executáveis no pacote | Nenhum — só `SKILL.md` + `LICENSE.txt` |
| Segredos / tokens / env | Ausentes |
| Production write / network tools implícitos | Ausentes |
| Comandos shell documentados | Nenhum |
| Prompt injection / tools perigosos | N/A (texto de orientação) |
| Risco vs `mcp-builder` | Menor (sem construção de servidores MCP) |

## Sobreposição com baseline interna

| Skill interna | Cobertura | Ganho desta externa adaptada |
|---|---|---|
| `nextjs-ui-polish` | Polish técnico de UI existente | Direção visual / identidade autoral |
| `revenue-centric-design` | Outcomes comerciais | Tipografia, composição, assinatura visual |
| `product-grill` | Validação de solução | Crítica estética específica |
| `test-hardening` | Confiabilidade automatizada | Screenshots / revisão visual (sem substituir testes) |

Interseção parcial; **não** duplicação integral. Lacuna coberta: direção criativa fundamentada no produto.

## Adaptações DevFlow (obrigatórias)

- Preservar design system e identidade existentes (`packages/ui`, tokens do app).
- Não substituir UI funcional sem escopo aprovado.
- Proibir conteúdo fictício quando dados reais forem necessários.
- Preferir stack já adotada no projeto.
- WCAG, contraste, HTML semântico, teclado completo; `prefers-reduced-motion`.
- Orçamento de performance e prevenção de CLS.
- Fontes externas só licenciadas e autorizadas.
- Estados: loading, empty, error, disabled, success.
- Screenshots desktop + mobile quando o ambiente permitir.
- Sem alterar regras de negócio / contratos HTTP.
- `BLOCK` se brief, conteúdo ou identidade do produto forem insuficientes.
- Wireframes em prosa/markdown (não exigir ASCII literal).

## Decisão e próximos passos

1. **ADAPT** — skill confiável `.cursor/skills/frontend-design/` (este PR).
2. Aplicação controlada numa tela real (PR de produto separado).
3. Medir ganho visual, a11y e manutenção.
4. Só então considerar `mcp-builder` (auditoria técnica mais profunda).

Baseline: atualizar inventário para **14** skills por decisão explícita deste piloto (ver `BASELINE.md` no mesmo PR).
