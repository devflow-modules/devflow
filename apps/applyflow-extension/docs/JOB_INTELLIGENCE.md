# Job intelligence local (ApplyFlow Sprint 4.2)

## Objetivo

Oferecer um **extrato estruturado** da vaga (senioridade, tipo de papel, modelo de trabalho, contrato, inglês, skills e menção salarial/heurística) usando apenas **regex e normalização de texto** no pacote **`@devflow/applyflow-core`** — sem LLM, sem backend e sem armazenar o corpo completo do anúncio em `chrome.storage`.

## Implementação

- **Ficheiro:** `packages/applyflow-core/src/job-intelligence.ts`
- **API pública:** `extractJobIntelligence(text: string): JobIntelligence`, `normalizeJobTextForIntel(text: string)`

O texto de entrada deve ser já um excerto disponível na página (ex.: raspagem limitada pelo content script); a função **não faz fetch** nem devolve esse texto nos resultados.

## Heurísticas (resumo)

- **Senioridade:** prioridade descendente sobre padrões (ex.: Staff/Principal/`lead` desenvolvimento, `senior`/`specialist`,`pleno`/`mid`, `junior`/`jr`).
- **Tipo de papel:** `fullstack` antes de frontend/backend; deteções específicas para mobile, dados e DevOps.
- **Modelo:** `hybrid` verificado antes de `remote`; depois `onsite`/presencial.
- **Contrato:** `CLT`, `PJ`, `contractor`/`contract …`, estágio/`intern`.
- **Inglês:** `english`, `fluent english`, `inglês` + qualificadores de obrigatoriedade.
- **Menção salarial/heurística:** palavras como `salary`, `compensation`, `faixa`, moedas comuns (`USD`, `BRL`, `R$`) — apenas **boolean** indicativo (`salaryMentioned`), não valores numéricos normalizados.
- **Skills:** lista fixa de tecnologias (React, Next.js, TypeScript, AWS, PostgreSQL, …); resultados deduplicados e ordenados alfabeticamente.

## Lista actual de skills (embed no código)

Ver o array `SKILL_PATTERNS` em `job-intelligence.ts` (ordem e regex). Novas tecnologias exigem PR no core mantendo regex seguras (palavras completas sempre que possível).

## Persistência (`jobMeta`)

Quando guarda histórico, a extensão grava apenas:

`seniority`, `roleType`, `workModel`, `contractType`, `englishRequired`, `salaryMentioned`, `detectedSkills`.

Validação ao persistir (`sanitizeApplyFlowJobMeta`): enums coerentes ou `unknown`, skills truncadas/deduplicadas, limite máximo na lista.

## Métricas agregadas (Opções › Histórico)

`computeApplicationMetrics` passa também a calcular sobre o mesmo filtro visual:

| Campo | Descrição breve |
|-------|----------------|
| `englishRequiredCount` | Registos com `jobMeta.englishRequired === true`. |
| `skillsTop` | Top 12 skills por frequência nos `detectedSkills` dos registos filtrados. |
| `byRoleType`, `byWorkModel`, `byContractType` | Histogramas (+ `unknown`). |

## Exportação CSV

Novas colunas após campos já existentes: `seniority`, `roleType`, `workModel`, `contractType`, `englishRequired`, `detectedSkills` (`|` entre skills).

Não há colunas `jobText` ou `rawSnippet`.

## Limitações conhecidas

- Linguagem informal, cargos criativos ou anúncios muito vagos ⇒ muitos `unknown`.
- Sobreposição lexical (ex.: «Java» vs contexto já coberto por `JavaScript`).
- Lista de skills finita por desenho; stacks de nicho ficam por detetar.
- **`salaryMentioned`** não substitui análise humana nem indica valores legais/efectivos.

## Próximos passos sugeridos (fora de âmbito)

- Curadoria adicional PT-BR lexical (ex.: gírias regionais «CLT Brasil» já coberto rudimentarmente).
- Internacionalização de rótulos no core (opcional).
