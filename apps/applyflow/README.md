# ApplyFlow — Dashboard web (local-first)

**Copiloto local-first para candidaturas no LinkedIn** — esta app é o **dashboard analítico** do ecossistema ApplyFlow: importas um JSON gerado na extensão (ou carregas uma demo fictícia) e vês funil, métricas e tabelas **só no browser**, sem backend ApplyFlow.

---

## Visão geral

| Rota | Função |
|------|--------|
| `/` | Landing de produto (problema, solução, privacidade, CTAs). |
| `/dashboard` | Import JSON, drag-and-drop, **Carregar demo**, gráficos Recharts, filtros; `localStorage` (`APPLYFLOW_DASHBOARD_IMPORT_V1`). |
| `/documentacao` | Índice dos ficheiros em `docs/applyflow/` do monorepo. |

Documentação alinhada: [`docs/applyflow/`](../../docs/applyflow/) · Case study: [`CASE_STUDY.md`](../../docs/applyflow/CASE_STUDY.md).

---

## Problema

Candidaturas no **LinkedIn Easy Apply** são repetitivas e fáceis de desorganizar; ferramentas agressivas geram risco de política da plataforma e de privacidade. Falta um fluxo que acelere **com responsabilidade** e dados **no dispositivo**.

---

## Solução

**Extensão Chrome** (repositório irmão) + **este dashboard**: a ponte é um **export/import JSON** que tu controlas — sem servidor ApplyFlow a processar o teu histórico.

---

## Why local-first?

- **Sem backend ApplyFlow obrigatório** — não há API nossa a receber o teu histórico no MVP.
- **Import/export JSON** — portabilidade e cópia de segurança sob controlo do utilizador.
- **Dashboard só no navegador** — landing e métricas sem conta DevFlow.
- **Dados permanecem localmente** (`localStorage` após import ou demo).
- Uma **camada serverless/cloud** (sync, contas, IA gerida) pode surgir como **evolução Pro opcional**; não faz parte do produto base. Ver [`docs/applyflow/ADR-LOCAL_FIRST_VS_SERVERLESS.md`](../../docs/applyflow/ADR-LOCAL_FIRST_VS_SERVERLESS.md).

---

## Principais features

- Import de ficheiro `.json` ou arrastar para a zona tracejada; validação com `@devflow/applyflow-core`.
- **Carregar demo** — dataset público fictício (`public/demo/applications-demo.json`); confirmação antes de substituir dados existentes.
- Métricas, funil por estado, distribuições (skills, modelo de trabalho, contrato, inglês).
- Tabela filtrável (período, estado, skill, etc.).
- Persistência apenas em **localStorage**.

---

## Arquitetura (resumo)

```
apps/applyflow-extension  →  chrome.storage.local, export JSON manual
         ↓ ficheiro
apps/applyflow            →  Next.js 16 App Router, localStorage
packages/applyflow-core   →  tipos, métricas, parse import, filtros (dist/)
packages/applyflow-linkedin → parser/campos (usado pela extensão)
```

Detalhe: [`docs/applyflow/ARCHITECTURE.md`](../../docs/applyflow/ARCHITECTURE.md).

---

## Stack

- Next.js 16 · React 19 · TypeScript estrito  
- Tailwind CSS v4 · Recharts  
- `@devflow/applyflow-core` — **obrigatório** `pnpm --filter @devflow/applyflow-core build` antes de `next build`

---

## Como rodar localmente

```bash
pnpm install
pnpm --filter @devflow/applyflow-core build
pnpm --filter applyflow dev
```

Por omissão o dev server do pacote expõe a app (ex.: [http://localhost:3010](http://localhost:3010)) — vê o output do terminal.

### Middleware

Não adicionar `src/middleware.ts` copiado do portal raiz do monorepo. Este dashboard é **local-first**, sem auth nem Supabase; o alias `@/` resolve apenas para `apps/applyflow/src`, por isso imports como `@/lib/auth-config` ou pacotes de cutover WhatsApp/Financeiro **não existem** aqui e quebram `pnpm dev`. Se existir um `middleware.ts` indevido, remove-o (o app não depende de middleware para `/`, `/dashboard` ou `/documentacao`).

---

## Como buildar

```bash
pnpm --filter @devflow/applyflow-core build
pnpm --filter applyflow build
```

O projeto usa **webpack** no `next build` para conviver com o monorepo.

---

## Como carregar a demo

1. Abre `/dashboard`.
2. Clica **Carregar demo** (âncora `/dashboard#carregar-demo` na landing).
3. Se já houver import, aparece `window.confirm` antes de substituir.
4. Feedback com contagem de candidaturas fictícias e registos ignorados, se houver.

---

## Como usar com a extensão

1. Instala e configura `apps/applyflow-extension` (perfil, opcionalmente IA opt-in).
2. Usa Easy Apply com o painel ApplyFlow; mantém envio **manual**.
3. Nas **Opções da extensão**, exporta o backup JSON (formato compatível com o schema do core — ver README da extensão).
4. No dashboard: **Importar JSON** ou arrastar o ficheiro.

---

## Privacidade

- O conteúdo importado **não** é enviado a backends externos pela app; apenas leitura local e validação.
- O `fetch` da demo acede só ao asset estático do **mesmo host** (`public/`).
- Limpar dados do navegador remove a chave `localStorage` do dashboard.

---

## Segurança

- O dashboard não substitui políticas do LinkedIn: submit e login são sempre humanos no site oficial.
- Trata o JSON exportado como **dado sensível** se contiver candidaturas reais.

---

## Testes

```bash
pnpm --filter @devflow/applyflow-core build
pnpm --filter applyflow test
```

Inclui validação de que `public/demo/applications-demo.json` é parseável.

---

## Roadmap

Ver [`docs/applyflow/ROADMAP.md`](../../docs/applyflow/ROADMAP.md) — polish, materiais de portefólio; **fora de escopo**: auto-submit, mass apply, scraping agressivo.

Checklist de publicação: [`docs/applyflow/PUBLICATION_CHECKLIST.md`](../../docs/applyflow/PUBLICATION_CHECKLIST.md).

---

## Status do projeto

**MVP técnico** pronto para demonstração: extensão + core + dashboard + testes e documentação de produto. Não implica disponibilidade na Chrome Web Store; distribuição é conforme o repositório e builds locais.

---

## Documentação relacionada

- Extensão: `apps/applyflow-extension/README.md`  
- Histórico local: `apps/applyflow-extension/docs/HISTORICO_LOCAL.md`  
- IA opt-in: `apps/applyflow-extension/docs/IA_OPT_IN.md`  
- Overview: `docs/applyflow/PRODUCT_OVERVIEW.md`
- Sistema visual: `docs/applyflow/DESIGN_SYSTEM.md`
- ADR local-first: `docs/applyflow/ADR-LOCAL_FIRST_VS_SERVERLESS.md`
- Cloud futuro (opcional): `docs/applyflow/SERVERLESS_FUTURE.md`
