# External skill audit — mcp-builder

Decisão: **PENDENTE** (auditoria aberta pós-KEEP do piloto `frontend-design`)  
Data de abertura: **2026-07-28**  
Branch: `chore/audit-external-mcp-builder`  
Pré-condição cumprida: experimento Inbox [#161](https://github.com/devflow-modules/devflow/pull/161) → **KEEP**

## Origem

| Campo | Valor |
|---|---|
| Upstream | [anthropics/skills — mcp-builder](https://github.com/anthropics/skills/tree/main/skills/mcp-builder) |
| Upstream `main` SHA (pin) | `b29e7cf65e5cb78a5ac33d582270551bc74a14eb` |
| Snapshot local | `.cursor/external-skills/quarantine/mcp-builder/` |
| Licença | Apache License 2.0 (`LICENSE.txt`) |
| Autor upstream | Anthropic (skills repository) |
| Método de obtenção | Download HTTP raw GitHub (sem `npx skills add`) |

### Inventário do snapshot + SHA-256

| Ficheiro | SHA-256 |
|---|---|
| `SKILL.md` | `0F4592DCB53CF2B5D6B7FEBEE6B4152018B565551A1C29E3C612F57B218AB295` |
| `LICENSE.txt` | `BC6B3AF2F331CBC7FB0DA1344EFB2CBE5877A31498B4D70DBC7000F3405A1362` |
| `reference/evaluation.md` | `8C99479F8A2D22A636C38E274537AAC3610879E26F34E0709825077C4576F427` |
| `reference/mcp_best_practices.md` | `80FB4369A349447CF18ECDD7494FE7938B6065377E9F08C077CEC411093A3007` |
| `reference/node_mcp_server.md` | `C3BA35A4F599DD53BE9C6555AE72C19A7BF412CD5426576C2C08D42755482C66` |
| `reference/python_mcp_server.md` | `2DA52F77E675191014CA2E146A4B95AA04D0CA7DD7E2B100322DF15ADE685E80` |
| `scripts/connections.py` | `9403668A2041568772082A8B334122C1F88DAF0541FB393AF4522D0094A47A6E` |
| `scripts/evaluation.py` | `49ED1D17CDCE5DA101B210197740713F49B935C29D4F339542A14B132658E6F7` |
| `scripts/example_evaluation.xml` | `9272B348DDCC4B06BA562367CCD0770E018158C0068AC5116D5E34AAEFF8777A` |
| `scripts/requirements.txt` | `D5D7558B2368ECEA9DFEED7D1FBC71EE9E0750BEBD1282FAA527D528A344C3C7` |

## Separação de autoria (planeada)

| Material | Classificação |
|---|---|
| Snapshot em `quarantine/mcp-builder/**` | **Importado** (verbatim) |
| Futuro `.cursor/skills/mcp-builder/SKILL.md` | **Derivado / autoria DevFlow** (só após decisão ADAPT) |
| Scripts Python de avaliação | Permanecem em quarentena até decisão explícita; **não** entram no catálogo confiável sem revisão |

## Segurança (achados iniciais)

| Check | Resultado |
|---|---|
| Scripts / deps executáveis | **Sim** — `scripts/*.py` + `requirements.txt` (`anthropic`, `mcp`) |
| Segredos versionados | Ausentes; docs pedem `ANTHROPIC_API_KEY` em runtime |
| Network / LLM calls | `evaluation.py` instancia `Anthropic()` e corre avaliações |
| Subprocess / stdio MCP | `connections.py` abre stdio/SSE/HTTP contra servidores MCP arbitrários |
| Production write implícito | Orientação de *build* de servidores MCP — risco operacional alto se usada sem guardrails |
| Alinhamento `.cursor/MCP.md` | Upstream não conhece política DevFlow (read-only default, MCPs aprovados, sem secrets no Git) |

**Risco:** alto vs `frontend-design` (só markdown). Qualquer ADAPT deve:

1. Tornar a skill **advisory-only** ou action-enabled **com aprovação explícita**.
2. `BLOCK` se faltar escopo, MCP aprovado, ou autorização de escrita.
3. Proibir instalar/ligar MCP de produção, Stripe/Meta/DB write, ou secrets em `.cursor/mcp.json`.
4. Manter scripts de avaliação **fora** do path confiável até segunda decisão (ou documentar como opcionais, nunca auto-executados).
5. Preferir TypeScript + stack já usada no monorepo; não inventar servidores fora da política MCP.

## Sobreposição com baseline interna

| Skill / doc interna | Cobertura | Lacuna que `mcp-builder` cobre |
|---|---|---|
| `.cursor/MCP.md` | Política de uso de MCP | Como *construir* servidores com qualidade |
| Commands `/audit-mcp` | Auditoria de configuração | Implementação de tools/resources |
| Skills operacionais | Domínio produto | Design de tools MCP genéricas |

Não duplica skills de produto; sobrepõe-se à política MCP — adaptação deve **deferir** a `.cursor/MCP.md` e `AGENTS.md`.

## Pré-condição de evidência (piloto anterior)

| Item | Estado |
|---|---|
| Skill `frontend-design` no catálogo | Sim (14 skills) |
| Experimento real Inbox | [#161](https://github.com/devflow-modules/devflow/pull/161) merged |
| Gate | **KEEP** — ver `apps/whatsapp-platform/docs/experiments/frontend-design-inbox-empty-2026-07-28.md` |

## Próximos passos (auditoria aberta)

1. [x] Quarentena verbatim + hashes.
2. [x] Achados de segurança iniciais.
3. [ ] Decisão humana: **ADAPT** (com guardrails) | **REJECT** | **ADAPT_DOCS_ONLY** (só markdown de referência, sem scripts).
4. [ ] Se ADAPT: derivar `.cursor/skills/mcp-builder/` + NOTICE + validar + atualizar `BASELINE.md` (15 skills) numa PR isolada.
5. [ ] Não executar `evaluation.py` no CI DevFlow sem aprovação e secrets fora do Git.

## Nota de freeze

Congelamento de `mcp-builder` **levantado** em 2026-07-28 após KEEP do experimento Inbox. Catálogo confiável **ainda não** inclui `mcp-builder` até decisão ADAPT neste fluxo.
