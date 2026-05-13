# ApplyFlow — checklist de screenshots

Objetivo: **pacote de mídia pública** alinhado ao [`PUBLICATION_CHECKLIST.md`](./PUBLICATION_CHECKLIST.md), sem PII, sem segredos e sem prometer produtos que ainda não existem.

Preferir **1080p** ou superior; cropar barras de sistema ou UI sensível quando necessário.

---

## Instruções operacionais (captura sem PII)

1. **Dados:** usar sempre o fluxo **Carregar demo** no dashboard (`public/demo/`) para material público. Se mostrar **import JSON**, use um ficheiro **anonimizado** ou gerado para testes — nunca export real com empresas, e-mails, URLs assinadas ou notas identificáveis.
2. **Segredos:** não aparecer **API keys**, tokens, passwords ou QR codes de autenticação no enquadramento.
3. **LinkedIn:** para o conjunto **oficial do README**, o print **06** deve vir do **Preview (captura)** nas opções da extensão — evita o DOM da rede social com mensagens ou contactos reais. Outros materiais opcionais (secção «Extensão» mais abaixo) podem usar Easy Apply **só** com vagas mascaradas e sem dados pessoais visíveis.
4. **Browser limpo:** para o **dashboard** e a **landing**, preferir **janela anónima / perfil Chrome sem extensões** **ou** `pnpm --filter applyflow build` + `pnpm --filter applyflow start` e capturar em produção. Extensões que injectam atributos no `<body>` (ex. `cz-shortcut-listen`) provocam *hydration mismatch* e o badge **«1 issue»** do Next em dev — não é bug do ApplyFlow.
5. **Substituição de ficheiros:** ao actualizar um print, **mantém o nome canónico** do ficheiro em [`docs/applyflow/assets/`](./assets/) para não partir links no [`apps/applyflow/README.md`](../../apps/applyflow/README.md) nem no GitHub.

---

## Comando rápido de verificação

Na **raiz do monorepo**:

```bash
ls -lh docs/applyflow/assets/*.png
```

- Esperam-se **6** linhas com os nomes canónicos (`01-` … `06-`).
- O comando confirma **existência e tamanho** no disco — **não** valida qualidade visual, PII dentro do PNG, nem overlay do Next.

### Se um PNG estiver ausente ou desactualizado

1. Seguir a tabela **Conjunto oficial** deste documento (rota, estado da UI, browser limpo / produção, demo fictícia no dashboard).
2. **Landing / dashboard / documentação:** `pnpm --filter applyflow build` + `pnpm --filter applyflow start`, ou janela anónima sem extensões em dev.
3. **Print 06:** `pnpm --filter applyflow-extension build` → Chrome → Opções da extensão → **Preview (captura)**.
4. Exportar o PNG para `docs/applyflow/assets/` com o **nome exacto** do canónico (substituir o ficheiro antigo se já existir).
5. Voltar a correr `ls -lh docs/applyflow/assets/*.png` e actualizar a tabela de estado abaixo.

---

## Conjunto oficial (6 PNG) — `docs/applyflow/assets/`

Estes ficheiros são os **referenciados pelo README** do dashboard. Índice da pasta: [`assets/README.md`](./assets/README.md).

| # | Nome exacto do ficheiro | Rota / origem | Estado esperado da UI | Privacidade e captura |
|---|-------------------------|---------------|------------------------|------------------------|
| 01 | `01-applyflow-hero.png` | `/` (landing) | Hero com título **ApplyFlow**, badges (ex. Local-first / Privacy-first), bullets e CTAs visíveis. | Sem dados de candidaturas. **Janela anónima sem extensões** ou build **produção** do dashboard para evitar overlay de hidratação. |
| 02 | `02-applyflow-dashboard-overview.png` | `/dashboard` | Visão geral do dashboard com **demo fictícia** carregada (métricas e cartões legíveis). | **Carregar demo** antes de capturar; não usar `localStorage` com import real para mídia pública. |
| 03 | `03-applyflow-analytics.png` | `/dashboard` (scroll até blocos de gráficos) | Pelo menos um gráfico Recharts (funil ou barras) com dados da **demo**. | Mesmo critério que **02** — só dados fictícios. |
| 04 | `04-applyflow-applications-table.png` | `/dashboard` (área da tabela) | Tabela de candidaturas com linhas **demo**; opcional: filtros/badges de estado visíveis. | Garantir que **empresas, títulos e URLs** na grelha são fictícios ou genéricos. |
| 05 | `05-applyflow-documentation-hub.png` | `/documentacao` | Hero do hub + secção **Essenciais** (cartões) visível. | Página é índice; sem PII. Mesmo cuidado de **browser limpo** que em **01** para evitar overlay em dev. |
| 06 | `06-applyflow-chrome-extension-preview.png` | Extensão: **Opções → Preview (captura)** (painel demo) | Painel de preview alinhado ao design system, **sem** depender do DOM do LinkedIn. | **Obrigatório** para material público do README: evita mensagens, threads ou PII da rede. Build actual: `pnpm --filter applyflow-extension build`. |

### Estado do conjunto oficial — ficheiro presente no repo

| # | Ficheiro | Ficheiro presente (nome canónico) |
|---|----------|-------------------------------------|
| 01 | `01-applyflow-hero.png` | [x] |
| 02 | `02-applyflow-dashboard-overview.png` | [x] |
| 03 | `03-applyflow-analytics.png` | [x] |
| 04 | `04-applyflow-applications-table.png` | [x] |
| 05 | `05-applyflow-documentation-hub.png` | [x] |
| 06 | `06-applyflow-chrome-extension-preview.png` | [x] |

*Última verificação de **existência** (`ls -lh docs/applyflow/assets/*.png` no workspace, 2026-05-12). O `[x]` acima significa apenas **ficheiro com nome canónico no disco**. A **revisão de conteúdo** do pixel está registada na secção **«Antes de publicar (revisão visual)»** abaixo.*

### Antes de publicar (revisão visual)

| Verificação | OK |
|-------------|-----|
| Conteúdo dos 6 PNG sem PII / dados reais / segredos visíveis | [x] |
| UI actual e alinhada ao produto actual | [x] |

*Revisão **assistida** em **2026-05-12**: inspecção dos PNGs via descrição semântica do conteúdo (e-mail, telefone, token/API key, URL privada, candidatura real, empresa sem sufixo demo, nome de pessoa além de marca, overlay «1 issue» / hydration, legibilidade). **Não** substitui uma última passagem humana no ecrã de retina se quiseres zero risco.*

#### Registo por ficheiro (2026-05-12)

| Ficheiro | Resultado | Notas |
|----------|-----------|--------|
| `01-applyflow-hero.png` | **Aprovado** | Hero + mock dashboard; «DevFlow Labs» como marca; dados de exemplo explicitamente demo; sem overlay Next. |
| `02-applyflow-dashboard-overview.png` | **Aprovado** | Mensagem «Demo carregada… fictícias»; métricas agregadas; sem PII nem overlay. |
| `03-applyflow-analytics.png` | **Aprovado** | Gráficos só com categorias agregadas; sem empresas nem contactos; sem overlay. |
| `04-applyflow-applications-table.png` | **Aprovado** | Coluna empresa com sufixo **`(demo)`**; datas futuras fictícias; sem overlay. |
| `05-applyflow-documentation-hub.png` | **Aprovado** | **Recapturado em 2026-05-12:** `pnpm --filter applyflow build` + `pnpm --filter applyflow start` + Chrome headless (`--window-size=1600,3800`) em `http://127.0.0.1:3010/documentacao` — cartões com **«Abrir no GitHub →»**; sem overlay Next; sem extensões de browser. **Tamanho do PNG maior que `01`–`04`/`06`** (mais pixels/conteúdo na página) — **esperado**, não bug. |
| `06-applyflow-chrome-extension-preview.png` | **Aprovado** | Modo demo explícito; sem dados pessoais; sem overlay. |

**Recapture opcional do `05` concluído** (2026-05-12) para alinhar ao UI actual. **Nenhum** outro recapture obrigatório por PII ou overlay na revisão assistida anterior.

---

## Antes de capturar (evitar falso «erro» do Next)

Em **modo dev**, extensões de browser podem injectar atributos no `<body>` e provocar *hydration mismatch* e o badge **«1 issue»** no overlay do Next — **não** vem do `layout.tsx` do ApplyFlow. Para prints profissionais: **aba anónima sem extensões**, **perfil Chrome limpo**, ou **`pnpm --filter applyflow build`** + **`pnpm --filter applyflow start`**.

---

## Capturas opcionais — landing e site

| # | Ficheiro sugerido | Objetivo | Onde usar |
|---|-------------------|----------|-----------|
| L1 | `applyflow-landing-hero.png` | Hero pós Sprint 6.3: título grande, linha de confiança, bullets, CTAs com tokens esmeralda. | README, portefólio, 1º slide LinkedIn |
| L2 | `applyflow-landing-features.png` | Grelha «O que está incluído» (3 cartões) + bloco privacidade com `ApplyFlowPrivacyNotice`. | Case study, deck |
| L3 | `applyflow-landing-privacidade.png` | Secção privacidade / arquitectura. | Medium, PDF |
| D0 | `applyflow-documentacao-index.png` | Página `/documentacao` (índice docs). | README “como explorar o repo” |

*Privacidade:* mesmas regras da secção operacional; nomes de ficheiro **não** substituem o conjunto oficial `01`–`06`.

---

## Capturas opcionais — dashboard web

| # | Ficheiro sugerido | Objetivo | Onde usar |
|---|-------------------|----------|-----------|
| D1 | `applyflow-dashboard-empty.png` | Estado sem dados + import + “Carregar demo”. | README, documentação “primeiro uso” |
| D2 | `applyflow-dashboard-demo-loaded.png` | Após demo: feedback verde + resumo. | Post LinkedIn “try the demo” |
| D3 | `applyflow-dashboard-metric-cards.png` | Cards de métricas (números legíveis). | Carrossel, portefólio |
| D4 | `applyflow-dashboard-charts-funnel.png` | Gráfico de funil / barras principais. | Case study, deck |
| D5 | `applyflow-dashboard-charts-mix.png` | Segundo gráfico (skills ou pizza contrato). | Idem |
| D6 | `applyflow-dashboard-table-filters.png` | Tabela com **badges de estado**, filtros na faixa estilo cartão, scroll horizontal se necessário. | Provar filtros |
| D7 | `applyflow-dashboard-filters-empty.png` | Estado «nenhum resultado para filtros» + Repor. | UX responsável |
| D8 | `applyflow-dashboard-privacy-bar.png` | Primeiro bloco «Privacidade local-first» no topo do dashboard. | Narrativa trust |

---

## Capturas opcionais — extensão (Chrome)

| # | Ficheiro sugerido | Objetivo | Onde usar |
|---|-------------------|----------|-----------|
| E1 | `applyflow-ext-modal-detection.png` | Painel sobre Easy Apply; cabeçalho «Estado do Easy Apply», cartões alinhados ao design system (esmeralda). | Hero técnico |
| E2 | `applyflow-ext-autofill-assisted.png` | Hierarquia Copiar (primário) / Preencher (secundário); sem PII. | Explicar autofill |
| E3 | `applyflow-ext-ia-optin-panel.png` | Bloco «IA (opt-in)» no painel (Gerar vs copiar); sem chave visível. | Privacidade / opt-in |
| E4 | `applyflow-ext-history.png` | Secção **Histórico local** no painel. | Fluxo dados |
| E5 | `applyflow-ext-job-intel-chips.png` | Cartão «Inteligência da vaga» com chips de contexto + skills. | Post técnico |
| E6 | `applyflow-ext-options-profile.png` | Opções — tabs e botões primário/secundário (perfil). | Onboarding README |
| E7 | `applyflow-ext-options-ia.png` | Secção IA nas opções + métricas/histórico com tokens alinhados. | Post EN “opt-in” |

---

## Notas

- **Sprint 6.3:** voltar a capturar landing, dashboard e extensão após unificação visual (`docs/applyflow/DESIGN_SYSTEM.md`).
- **Dados:** preferir sempre **demo** ou empresas fictícias; nunca colar segredos ou PII real.
- **Crédito:** “ApplyFlow · DevFlow Labs” opcional no canto para portefólio.
- **Roteiro de vídeo:** [`DEMO_SCRIPT.md`](./DEMO_SCRIPT.md).
