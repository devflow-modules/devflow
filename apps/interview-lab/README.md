# DevFlow Interview Lab

MVP **local-first** para treinar live coding em inglês: problemas guiados, editor JavaScript, runner no browser, timer de 25 minutos, checklist de entrevista, speaking prompts, symbol pad e histórico em `localStorage`.

## ApplyFlow import (CareerBundle)

1. No dashboard ApplyFlow (**Exportar para Interview Lab**) gera o JSON localmente.
2. No Interview Lab, abre **`/import/applyflow`**, cola ou envia o ficheiro e usa **Parse field** / upload.
3. **Train for this role** abre a prática com o painel de preparação (`?careerPrep=`).

Detalhes e roteiro de demo: [`docs/career-suite/README.md`](../../docs/career-suite/README.md).

## Interview Briefing Mode

Rota **`/briefing`**: preparação final antes de entrevistas reais — formulário local, briefing **determinístico** (sem API externa, sem OpenAI), exportação Markdown, persistência em `localStorage`. **Não** é ferramenta de uso oculto: sem áudio, sem captura de ecrã, sem overlay invisível, sem assistência durante a entrevista.

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
| `/import/applyflow` | Importar `CareerBundle` exportado pelo ApplyFlow |
| `/briefing` | Interview Briefing Mode — preparação estruturada (local, sem IA externa) |
| `/practice/[problemId]` | Sala de prática (3 colunas em desktop); query `careerPrep` mostra painel ApplyFlow |
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
