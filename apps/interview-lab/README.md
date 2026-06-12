# DevFlow Interview Lab

MVP **local-first** para treinar live coding em inglês: problemas guiados, editor JavaScript, runner no browser, timer de 25 minutos, checklist de entrevista, speaking prompts, symbol pad e histórico em `localStorage`.

**Ciclo Career Suite (tudo no browser):** **Resume → descrição da vaga → análise de match (estilo ATS) → lacunas & perguntas → prática de entrevista** (`/career/ats` → `?careerPrep=`), em complemento ao import **ApplyFlow** em `/import/applyflow`.

## Resume Match (`/career/ats`)

**Narrativa:** **Currículo (texto) → descrição da vaga → análise de match → gaps / keywords / sugestões → prática** com o mesmo painel de preparação que o fluxo ApplyFlow (`CareerPrep` em `localStorage`, depois `/practice/...?careerPrep=`).

- **Heurística local e determinística** neste build — **não** é um ATS certificado; **sem** upload para servidores DevFlow e **sem** API externa obrigatória na análise base.
- **IA opcional (OpenAI):** depois da análise local, podes pedir **AI Resume Coaching** — só corre quando clicas em **Generate AI coaching**; usa a **mesma chave API** guardada no browser que a página **AI Answer Review** (opt-in, `localStorage`). Nada é enviado automaticamente.
- **Demo rápida:** **Load sample analysis** (preenche CV + vaga genéricos) → **Analyze ATS match** → rever scores e secções → **Practice interview from this analysis** para abrir a simulação focada.

## ApplyFlow import (CareerBundle)

**Lista / importação (recomendado para várias vagas):** no dashboard ApplyFlow, **Prepare in Interview Lab** abre `/import/applyflow?from=applyflow&handoff=postMessage` e envia o `CareerBundle` por `window.postMessage` (sem bundle na URL; `intent` omitido = import). O Interview Lab valida tipo, origem e payload (`@devflow/career-core`) e responde com ACK. Se o handoff automático falhar, o ApplyFlow tenta copiar o JSON para o clipboard como fallback.

**Prática directa (uma vaga):** na tabela do dashboard, **Practice this role** abre `/import/applyflow?from=applyflow&handoff=postMessage&intent=practice`, envia um bundle de **uma** linha com `intent: "practice"` e `selectedApplicationId`, e o Interview Lab importa, gera o prep e redirecciona para `/practice/most-frequent-category?careerPrep=…`. Se o id não existir no bundle, mostra a lista importada com mensagem amigável.

**Fluxo clipboard + nova aba:** **Copy CareerBundle** → **Open Interview Lab** (`?from=applyflow`) → **Import from clipboard**.

**Fluxo clássico:** **Exportar para Interview Lab** (`.json`) → colar/upload + **Parse field**.

Variáveis opcionais (build): no ApplyFlow, `NEXT_PUBLIC_INTERVIEW_LAB_URL` (base do Interview Lab; default `http://localhost:3015`). No Interview Lab, `NEXT_PUBLIC_APPLYFLOW_URL` com o **mesmo origin** de onde abres o dashboard (default `http://localhost:3010`) — necessário para aceitar `postMessage` e para o ACK voltar ao opener em ambientes não locais.

1. ApplyFlow: preparar / copiar / exportar o CareerBundle (JSON só no teu dispositivo).
2. Interview Lab: **`/import/applyflow`** — import automático (postMessage), **Import from clipboard**, cola + **Parse field**, ou upload.
3. **Train for this role** (import ApplyFlow) ou **Practice interview from this analysis** (**Resume Match** em `/career/ats`) abre a prática com o painel de preparação (`?careerPrep=`).

### Sync enrichment import preview

When a CareerBundle includes optional validated sync enrichment, `/import/applyflow` shows a **read-only** aggregated preview (summary, signal counts, company hints, privacy flags). Sync data is **not** persisted in `localStorage` — only the base CareerBundle is stored.

Detalhes, roteiro alargado e **case study de portefólio (Resume Match + IA opcional):** [`docs/career-suite/README.md`](../../docs/career-suite/README.md) · [`docs/career-suite/RESUME-MATCH-CASE-STUDY.md`](../../docs/career-suite/RESUME-MATCH-CASE-STUDY.md) · **case público:** [`docs/public-cases/CAREER-SUITE.md`](../../docs/public-cases/CAREER-SUITE.md).

## Interview Briefing Mode

Rota **`/briefing`**: preparação final antes de entrevistas reais — formulário local, briefing **determinístico** (sem API externa, sem OpenAI), exportação Markdown, persistência em `localStorage`. **Não** é ferramenta de uso oculto: sem áudio, sem captura de ecrã, sem overlay invisível, sem assistência durante a entrevista.

## AI Answer Review (opcional)

Rota **`/ai-review`**: revisão de **respostas escritas** pelo candidato, **opt-in** e **só após clique** em *Review answer* — nada corre em background, sem áudio, sem captura, sem modo invisível.

- **Modo local (mock):** predefinido, sem chave, sem rede; útil para demo e testes.
- **OpenAI (opcional):** só se ativares a opção e guardares a **tua** API key neste browser (`localStorage`); a key não é enviada para servidores DevFlow, apenas para a API OpenAI quando pedes uma revisão.

Após um review bem-sucedido, **Export Markdown** gera um `.md` local (nome com empresa/role sanitizados + data) com a resposta original, contexto opcional, score, bullets e versão melhorada — útil para revisão offline ou notas.

Aviso na própria página: não usar como ajuda oculta durante entrevistas ao vivo.

## Como correr

Na raiz do monorepo (com dependências já instaladas):

```bash
pnpm --filter @devflow/app-interview-lab dev
```

Abre em `http://localhost:3015`.

Build de produção:

```bash
pnpm --filter @devflow/career-core build
pnpm --filter @devflow/app-interview-lab build
pnpm --filter @devflow/app-interview-lab start
```

Testes (Vitest, só pacote):

```bash
pnpm --filter @devflow/app-interview-lab test
```

## Rotas

| Rota | Descrição |
|------|-----------|
| `/` | Home com problemas por padrão + últimos treinos |
| `/import/applyflow` | Importar `CareerBundle` do ApplyFlow (postMessage, clipboard, paste, ficheiro); `?intent=practice` com handoff postMessage abre prática directa |
| `/career/ats` | **Resume Match** — análise local + opcional **AI Resume Coaching** (OpenAI só após clique, mesma chave que AI Answer Review); handoff **Practice interview from this analysis** → `?careerPrep=` |
| `/briefing` | Interview Briefing Mode — preparação estruturada (local, sem IA externa) |
| `/ai-review` | AI Answer Review — revisão escrita opt-in (mock local; OpenAI só com chave tua) |
| `/practice/[problemId]` | Sala de prática (3 colunas em desktop); query `careerPrep` mostra painel de preparação (ApplyFlow ou ATS) |
| `/session/[sessionId]` | Resumo após **Finish simulation** |

## Limitações

- O runner usa **`new Function`** para avaliar o teu código — **apenas para uso local / confiança total**; não é isolamento de segurança nem sandbox de produção.
- Sem Monaco no MVP: **textarea** com fonte monoespaçada (mais leve; Monaco pode vir depois).
- Persistência só em **`localStorage`** (limite do browser, limpa se apagares dados do site).
- Teste **debounce** usa timers reais (~90 ms) — em máquinas muito lentas pode falhar marginalmente.

## Próximos passos sugeridos

- Monaco ou CodeMirror + temas alinhados ao DevFlow.
- IndexedDB para histórico maior e export JSON.
- Modo “strict” com `iframe`/`worker` para isolar execução.
- Pack de problemas importável e estatísticas por padrão.
