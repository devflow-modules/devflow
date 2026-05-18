# ApplyFlow — case study (portfólio público)

**ApplyFlow** é um copiloto **local-first** e **privacy-first** para candidaturas no **LinkedIn Easy Apply**: extensão **Chrome (Manifest V3)** + **dashboard Next.js**, com dados no dispositivo do utilizador e **sem backend obrigatório** no MVP.

Este documento é uma versão **pública e enxuta** para portfólio controlado. Não expõe código privado, métricas de mercado inventadas nem dados pessoais. O repositório permanece **privado**; a divulgação é feita por case, post e capturas de ecrã curadas.

---

## O problema

Candidatos em Easy Apply enfrentam três fricções recorrentes:

1. **Repetição** — as mesmas perguntas e metadados voltam em quase todas as vagas, o que aumenta erros e desgaste.
2. **Histórico disperso** — estado da candidatura fica espalhado por abas, notas e folhas, sem funil claro.
3. **Pressão por automação agressiva** — ferramentas de *mass apply* ou *auto-submit* colocam em risco a conta na plataforma e a privacidade dos dados de carreira.

O desafio de produto não era “enviar mais candidaturas”, mas **ajudar com consistência e controlo**, alinhado às regras da plataforma.

---

## A solução

ApplyFlow actua como **copiloto assistido**, não como bot:

| Camada | Função |
|--------|--------|
| **Extensão Chrome MV3** | Painel no Easy Apply: classificação heurística de campos, sugestões a partir de um perfil validado, **autofill só com acção humana**, histórico em `chrome.storage.local`, export JSON. |
| **Dashboard Next.js** | Import do JSON (ou demo fictícia): funil, métricas, gráficos e filtros **só no browser** (`localStorage`). |
| **Pacotes TypeScript partilhados** | Mesmo contrato de dados entre extensão e dashboard (validação, parse, métricas) — sem drift silencioso de schema. |

**Princípios fixos do MVP:**

- **Local-first** — nenhum servidor ApplyFlow no caminho crítico; o utilizador mantém os dados.
- **Sem auto-submit** — a extensão não clica em enviar; cada passo no formulário é decisão humana.
- **IA opt-in** — texto longo opcional no cliente, com chave do próprio utilizador; não é requisito do produto.
- **Demo fictícia** — onboarding e portfólio sem perfil real nem histórico de candidaturas reais.

---

## Fluxo do utilizador

1. Configurar perfil (e opcionalmente IA) na página de opções da extensão.
2. Abrir uma vaga Easy Apply no LinkedIn; o painel sugere respostas e permite copiar ou preencher **campo a campo**, com *safety gate*.
3. Registar candidatura no histórico local; exportar JSON quando quiser análise no dashboard.
4. Importar o ficheiro no dashboard (arrastar ou seleccionar) ou carregar a **demo pública** embutida.
5. **Handoff para Interview Lab** — exportar um *CareerBundle* estruturado para treino de entrevista por vaga (produto irmão no mesmo ecossistema, também local-first).

O elo extensão ↔ dashboard é **ficheiro JSON**, não sync em tempo real: trade-off consciente por privacidade e simplicidade.

---

## Arquitectura (visão de engenharia)

```text
┌─────────────────────┐     export JSON      ┌─────────────────────┐
│  Chrome Extension   │ ──────────────────►  │  Dashboard Next.js  │
│  (content script +  │                      │  (import + charts)  │
│   options + SW)     │                      │                     │
└─────────┬───────────┘                      └─────────┬───────────┘
          │                                              │
          └──────────────────┬───────────────────────────┘
                             ▼
                   ┌───────────────────┐
                   │  Core partilhado   │
                   │  (tipos, Zod,      │
                   │   métricas, parse) │
                   └───────────────────┘
                             │
                   ┌─────────┴───────────┐
                   ▼                     ▼
            Parser LinkedIn        Interview Lab
            (heurísticas)          (CareerBundle)
```

**Decisões técnicas relevantes:**

- **MV3** com content script isolado (IIFE), service worker para acções de extensão (ex.: abrir opções), storage local.
- **Guard de contexto** — painel e observadores de DOM activos apenas em rotas `/jobs*` do LinkedIn; páginas como notificações ou feed não montam o copiloto.
- **Next.js (App Router)** para landing, dashboard e hub de documentação; validação de import com as mesmas regras da extensão.
- **Testes Vitest** no core, parser, extensão e dashboard; **smoke manual** documentado para fluxos críticos.

---

## Privacidade e responsabilidade

- Dados sensíveis permanecem no **dispositivo** (extensão e browser).
- Não há API ApplyFlow a receber histórico de candidaturas no MVP.
- Export com dados reais deve ser tratado como **informação pessoal** pelo utilizador.
- **Safety gate** e classificação de campos reduzem preenchimento cego em controlos de risco (ex.: submit, campos desconhecidos).
- Materiais públicos usam **entidades fictícias** e capturas sem PII.

---

## Validação e qualidade

Validação combinada **automatizada** e **manual**:

| Área | Evidência |
|------|-----------|
| **Build** | Core TypeScript, extensão Vite, dashboard Next — reprodutíveis em CI local. |
| **Testes** | Dezenas de testes unitários (parser, storage, opener de opções, guardas de rota). |
| **Smoke manual (2026-05-18)** | Landing, dashboard, import JSON, handoff Interview Lab, extensão no Easy Apply, botão de opções, export JSON — **PASS**. |
| **Console no LinkedIn** | Ruído `chrome-extension://invalid/` observado **com extensão desactivada** — classificado como **externo** ao ApplyFlow (outra extensão / bloqueio do browser), sem bloquear o fechamento do case. |

Não são declarados utilizadores activos, receita nem taxas de conversão — apenas **capacidade técnica demonstrável**.

---

## O que ficou fora do MVP (de propósito)

- Backend obrigatório, login cloud, sync automático entre dispositivos.
- Auto-submit ou *mass apply*.
- Chrome Web Store como promessa de distribuição.
- Billing, planos Pro ou IA gerida no servidor.

Evoluções hipotéticas (sync, serverless) estão documentadas internamente como **futuro opcional**, não como produto entregue.

---

## Aprendizados técnicos

1. **Local-first é decisão de produto**, não apenas “MVP sem servidor” — simplifica compliance e narrativa, com custo de um passo manual (export/import).
2. **Content scripts em sites SPA** exigem guardas de rota e teardown — injectar em `linkedin.com/*` não significa activar UX pesada em todo o site.
3. **Abrir páginas de extensão a partir do content script** deve passar pelo **service worker**; fallbacks com `getURL` no DOM da página geram ruído e URLs inválidas após reload da extensão.
4. **Schema único** (Zod + pacote core) paga dividendos entre extensão, dashboard e handoff Interview Lab.
5. **Copiloto ≠ bot** — gates de segurança e copy honesta vendem melhor a recrutadores e a equipas de engenharia do que “automação total”.

---

## O que este case demonstra

- Produto pensado de ponta a ponta: problema real, ética de plataforma, escopo fechado.
- **TypeScript** com fronteiras claras entre extensão, web e bibliotecas partilhadas.
- **Chrome Extension MV3** com preocupação explícita em contexto invalidado, storage local e UX no Easy Apply.
- **Next.js** para analytics locais sem inflar backend.
- Disciplina de **documentação**, smoke manual e portfólio **controlado** (sem abrir monorepo).

---

## Estratégia de publicação

- **Repositório:** privado.
- **Divulgação:** case público (este documento), post LinkedIn, capturas oficiais sem PII, demo ao vivo sob pedido.
- **Próximo passo de mídia:** seleccionar prints seguros e publicar narrativa alinhada a *local-first* e *sem auto-submit*.

---

*ApplyFlow — DevFlow Labs · case de portfólio · 2026*
