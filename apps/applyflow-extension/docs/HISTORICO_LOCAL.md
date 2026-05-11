# Histórico local de candidaturas (ApplyFlow Sprint 4 + 4.1 + 4.2)

## Objetivo

Permitir que o utilizador guarde manualmente uma **entrada discreta por vaga**, no próprio navegador, para acompanhar o pipeline de candidaturas **sem backend**, sem automação de envio ao LinkedIn e sem armazenar respostas do Easy Apply ou texto integral das páginas.

Na **Sprint 4.1** acrescenta-se **métricas e visão de funil** calculadas **só no dispositivo**, com filtros por tempo e por estado, marcadores de candidaturas «paradas», e exportações que respeitam o filtro visível.

Na **Sprint 4.2** acrescenta-se **`jobMeta`**: etiquetas inferidas por `extractJobIntelligence` sobre um excerto textual (≤16k) apenas no momento relevante (`Salvar no histórico`), **sem texto bruto persistente**.

## Modelo de dados

Tipo principal: **`ApplyFlowApplication`** (`apps/applyflow-extension/src/storage/application-storage.ts`)

- **`id`**, **`createdAt`**, **`updatedAt`**
- **`source`**: apenas `linkedin` nesta sprint
- **`jobTitle`**, **`companyName`**, **`jobUrl`** (opcionais; URL normalizada sem fragmento quando persistida para dedupe)
- **`status`**: `reviewing` | `applied` | `ignored` | `waiting_response` | `interview` | `technical_test` | `rejected` | `accepted`
- **`fitScore`**: número heurístico calculado à hora da gravação (derivado do **texto já existente na página**, truncado apenas em memória — o texto não é guardado junto ao registo)
- **`fieldsDetected`**, **`fieldsFilled`**, **`blockedCount`**, **`failedCount`**: contagens do painel / sessão de autofill
- **`notes`**: texto curto opcional (editável na página de Opções)
- **`jobMeta`** *(opcional, Sprint 4.2)*: `seniority`, `roleType`, `workModel`, `contractType`, `englishRequired`, `salaryMentioned`, `detectedSkills[]` — ver `docs/JOB_INTELLIGENCE.md`

**Chave Chrome:** `APPLYFLOW_APPLICATIONS_V1`  
**Limite:** 500 registos (mais recentes primeiro ao ler).  
**Dedupe:** por `jobUrl` normalizado; um segundo «Salvar» para a mesma URL actualiza o mesmo `id`.

## Métricas implementadas (Sprint 4.1)

Ficheiro: **`src/storage/application-metrics.ts`**

Tipo **`ApplicationMetrics`**: `total`, `byStatus`, `last7Days`, `last30Days`, `staleCount`, `interviewRate`, `technicalTestRate`, `acceptedRate`, `rejectedRate`, `averageFitScore` (opcional), e **Sprint 4.2:** `skillsTop`, `byRoleType`, `byWorkModel`, `byContractType`, `englishRequiredCount`.

As métricas são calculadas com **`computeApplicationMetrics(applications, now)`** sobre a lista **já intersectada** pelo utilizador na UI de Opções:

1. `getApplicationsByPeriod` — `all`, `7d`, `30d`, `90d` comparando **`createdAt`** com um limite móvel `(now − N dias)`.
2. Filtro opcional de **estado** sobre esse subconjunto.

Assim, **tabela e cartões** reflectem o mesmo dataset (excepto o chip «Parada», que é por linha).

### Fórmulas (implementação)

| Métrica | Definição |
|--------|-----------|
| `total` | Número de linhas no conjunto actual. |
| `byStatus[k]` | Contagem de registos com `status === k`. |
| `last7Days` | Registos no conjunto cuja `createdAt` cai em `[now−7d, now]`. |
| `last30Days` | Idem com `[now−30d, now]`. |
| `staleCount` | Registos com `status ∈ {reviewing, applied, waiting_response}` **e** `updatedAt` há **≥ 7×24h**. |
| `interviewRate` | (# com `interview`) / `total` (0 se `total=0`). |
| `technicalTestRate` | (# `technical_test`) / `total`. |
| `acceptedRate` | (# `accepted`) / `total`. |
| `rejectedRate` | (# `rejected`) / `total`. |
| `averageFitScore` | Média arredondada dos `fitScore` finitos; omitida se não houver nenhum. |
| `englishRequiredCount` | Contagem de registos com `jobMeta.englishRequired === true`. |
| `skillsTop` | Top 12 skills por frequência em `jobMeta.detectedSkills` (no conjunto filtrado). |
| `byRoleType` / `byWorkModel` / `byContractType` | Histogramas chave → contagem; `unknown` quando `jobMeta` ou campo em falta. |

**Chip «Parada 7+ dias»** na tabela: `isApplicationStale7d(record, now)` — mesma regra de `staleCount` por linha (sem notificação push nesta sprint).

### Exportação filtrada

- **CSV (filtro)** e **JSON (filtro)** serializam apenas `visibleRows`.
- **Backup JSON completo** chama `getApplications()` e ignora filtros da UI.

## Privacidade

- Nada é enviado a servidores DevFlow ou LinkedIn por este fluxo.
- Não persistimos `suggestedValue`, respostas de formulário, salário preenchido, carta completa nem corpo completo da vaga.
- Export JSON/CSV mantém-se no modelo de metadados (`application-history-export.ts`), incluindo colunas **`job intelligence`** compactas (`detectedSkills` em CSV delimitadas por `|`).

## Limites

- 500 entradas no total; entradas antigas deixam de ser acessíveis após rotação quando o limite é excedido nas gravações.
- Heurísticas de `jobTitle` / `companyName` dependem do DOM LinkedIn.
- Métricas **dependem** de `createdAt` / `updatedAt` confiáveis; filtros de período não mostram fora da janela registos que ainda existam no armazenamento.
- Com filtro de estado «Entrevista», os cartões mostram só esse subconjunto (ex.: taxa de entrevista pode ser 100% — é esperado).

## Checklist manual

1. LinkedIn Easy Apply aberto; painel ApplyFlow › **Histórico local** › **Salvar no histórico**.
2. Opções › **Histórico** — alternar **Todos / 7 / 30 / 90 dias** e **estado**; confirmar que **totais** na grelha mudam em conjunto com a tabela.
3. Procurar linha **Parada 7+ dias** (estados rev./aplic./aguardando com `updatedAt` antigo).
4. **Exportar CSV (filtro)** com filtro activo e confirmar número de linhas.
5. Confirmar **Backup JSON completo** com mais linhas que o filtro, se existirem dados extra no storage.

## Debug

`localStorage.APPLYFLOW_DEBUG === "true"`: eventos de gravação/remoção/dedupe na storage de candidaturas — sem valores de formulário.

## Próximos passos (fora de âmbito desta sprint)

- Importar JSON com validação Zod.
- Sincronização opcional com backend ou notificações locais (chrome.alarms).
