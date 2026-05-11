# ApplyFlow (extensão Chrome)

ApplyFlow é um **copiloto assistido** para o fluxo **LinkedIn Easy Apply**, criado pela DevFlow Labs. Lê rótulos de campos visíveis no modal, gera **sugestões** com base num **perfil profissional** (por defeito o de referência “Gustavo”, ou o que configurar nas opções) e permite **copiar** ou **preencher campo a campo** — **sem enviar candidaturas**.

## Garantia importante

ApplyFlow **não clica em Submit**, **não envia** a candidatura, **não avança** passos automaticamente (**Next**/continuar é sempre manual no LinkedIn) e **não** preenche em massa. O envio final é sempre decisão sua no próprio formulário Easy Apply.

## Dashboard web (métricas no browser)

Existe uma app **Next.js** em `apps/applyflow` que importa o JSON exportado (ex.: backup completo em **Opções › Histórico**) e mostra métricas, funil e tabela — **sem backend ApplyFlow**, apenas no navegador. Inclui **dados de demo** fictícios para apresentação. Ver `apps/applyflow/README.md` e `docs/applyflow/` (inclui **case study**, roteiro de vídeo, checklist de publicação e posts).

## Local-first e evolução cloud (documentada, não implementada)

- **Armazenamento:** perfil, histórico e definições em **`chrome.storage.local`** no dispositivo — sem servidor ApplyFlow no MVP.
- **Export:** backups JSON (perfil, histórico) para ficheiro; partilha só quando tu quiseres.
- **Dashboard:** importação do JSON no site `apps/applyflow`; métricas e funil **no browser**.
- **IA:** opt-in no cliente com a tua chave; sem backend ApplyFlow para texto gerado.
- **Sync cloud:** **não existe** na versão atual; qualquer sincronização automática num futuro **Pro** seria **opt-in**, com termos e modelo de dados explícitos — ver `docs/applyflow/ADR-LOCAL_FIRST_VS_SERVERLESS.md` e `docs/applyflow/SERVERLESS_FUTURE.md`.

## Segurança do autofill (safety gate)

Antes de tocar no DOM, o ApplyFlow avalia **`canAutofillField`** (`src/content/autofill/autofill-safety.ts`):

- **Valor vazio**: bloqueia o preenchimento (mantém apenas **Copiar** se já houver texto noutro cenário ou após edição manual do perfil).
- **Tipo `unknown`** (classificação LinkedIn incerta): exige primeiro **«Confirmar preenchimento»** no cartão; só depois o botão de preenchimento fica disponível com o mesmo clique habitual.
- **Confiança da sugestão ou da classificação `low`**: igual — confirmação explícita obrigatória.
- **`high` / `medium`**: permite **«Preencher»** diretamente (mantendo sempre o clique seu).
- Tipos DOM como **`submit`** / **`button`** / **`next`** (família veto final após resolver o controlo) **nunca** são aceites pelo gate.

Motivos aparecem no cartão em **«Segurança autofill: …»**.

### Baixa confiança ou desconhecido — como validar

1. Ler o motivo cinza/amarelo no cartão.
2. Clicar **«Confirmar preenchimento»** se aceitar o risco.
3. Depois clicar **«Preencher (confirmado)»** (rótulo que deixa explícito que já houve aceite manual).

Para situações muito delicadas pode usar só **Copiar**.

## Auditoria local mínima (sem backend)

Histórico em **`chrome.storage.local`** sob a chave **`APPLYFLOW_AUTOFILL_AUDIT_V1`** (implementação em `src/storage/autofill-audit-storage.ts`), no máximo **100** eventos (os mais recentes).

**Cada evento pode incluir** (conforme disponível): `timestamp`, `jobTitle`, `companyName` (titulo empresa derivados do snippet **já raspado pela extensão** — não guardamos o texto completo da vaga), `fieldType` (tipologia DOM resolvida ou `unresolved`), `classificationType`, `confidence` (da sugestão), `result` (`success` | `failed` | `blocked`) e **`reason`** truncada (sem valores do campo).

### O que **não** é guardado

- Conteúdo da sugestão / valor aplicado (**nunca `suggestedValue`**).
- Etiqueta completa da pergunta (podia conter PII) — apenas `classificationType` e metadados anteriores.
- Texto integral da página da vaga.

### Como limpar a auditoria

- Programaticamente/consola de extensão: `chrome.storage.local.remove('APPLYFLOW_AUTOFILL_AUDIT_V1')` (via DevTools ligado ao service worker/extension context), ou remover a entrada em **`chrome.storage.local`** através de uma ferramenta de inspeção.
- Ou reinstalar/limpar dados da extensão no Chrome (**apaga também o perfil** `APPLYFLOW_PROFILE_V1` se não fizeste cópias).

Estado **Limpar sessão** no painel **não apaga** a auditoria persistente — só reinicia os contadores em memória desta sessão na aba.

## Sessão no painel (memória apenas)

Um bloco no painel mostra, **nesta aba**: preenchidos com sucesso / falhas (DOM/modal) / bloqueados (segurança). **Limpar sessão** zera apenas estes números; não envolve servidor.

## Copiar versus Preencher

| Ação | O que faz |
|------|-----------|
| **Copiar** | Copia o texto da sugestão para a área de transferência (fallback universal). Use quando o formulário usar editores especiais ou o Preencher falhar. |
| **Preencher** | Só quando **clica** neste botão (depois das confirmações de segurança se aplicável): resolve o campo visível, aplica valor com eventos compatíveis com React. Nunca corre sozinho. |

Textos **muito longos** (ex.: carta): o painel sugere usar **Copiar** se suspeitar de editor especial.

## Campos suportados para Preencher

- `input[type="number"]` (anos de experiência)
- `input[type="text"]` e outros `input` tratados como texto (excetuando tipos excluídos)
- `textarea`
- `select` — apenas quando existe **coincidência inequívoca** com a sugestão (valor ou texto da opção)
- grupo **radio** tipo **Sim/Não**, **Yes/No**, valores próximos (com valores `yes/no`, `sim/nao`, etc.)

Campos **hidden**, **disabled**, `submit`/`button`/etc. são **ignorados**.

## Debug

Na página **`linkedin.com`** (consola):

```js
localStorage.APPLYFLOW_DEBUG = "true";
```

Com debug ativo, `[ApplyFlow]` regista resultado do **safety gate**, escrita na **auditoria** e actualização dos **contadores de sessão** — **sem** logar valores completos de sugestão.

Para desativar:

```js
localStorage.removeItem("APPLYFLOW_DEBUG");
```

## O que não faz

- Backend próprio DevFlow, base remota ou login nesta extensão.
- Burlar login, CAPTCHA ou limitações do LinkedIn.
- Preencher sem clique seu em **Preencher / Confirmar**, nem campos não visíveis.

## Sprint 5 — IA opt-in (OpenAI, local)

Funcionalidade **desactivada por defeito**. Se activar em **Opções › IA**, a extensão pode, **após o seu clique em «Gerar com IA»**, enviar um pedido **HTTPS** à **OpenAI** com:

- Perfil configurável (JSON derivado do `CandidateProfile`, sem bloco de salário no prompt).
- Contexto reduzido da vaga (título, empresa, meta heurística local, excerto limitado do texto já em memória no painel).
- Rótulo / texto visível do campo quando aplicável.

**Nunca** é gravado no histórico de candidaturas: texto gerado completo, cover letter nem prompt. **API key** só em `chrome.storage.local`; export «seguro» de definições mascara a chave; não é registada na auditoria.

**Auditoria IA:** chave `APPLYFLOW_AI_AUDIT_V1`, até **100** eventos (`task`, `result`, `reason` truncado, `generatedLength` — sem corpo da resposta).

Detalhes: [`docs/IA_OPT_IN.md`](docs/IA_OPT_IN.md).

### Limitações e custos

- Consumo **pago** conforme tarifas OpenAI do modelo escolhido.
- Requer rede; falhas **401 / 429 / 5xx** e timeouts mostram mensagem no painel.
- ApplyFlow **continua a não enviar candidaturas** nem a clicar em Submit/Next.

## Perfil local (Sprint 2)

- **`APPLYFLOW_PROFILE_V1`** — perfil validado (`@devflow/applyflow-core`).
- **`APPLYFLOW_SETTINGS_V1`** — `version: 1`, `flags` opcional, **`ai`** opcional (OpenAI opt-in).

Opções da extensão: `chrome://extensions` → ApplyFlow → **Opções**. Export/import do **perfil** mantém apenas **CandidateProfile** validado. Para definições gerais incluindo IA, use **Exportar definições (seguro)** na aba IA (chave mascarada).

## Sprint 4 — Histórico local de candidaturas

Registos apenas no dispositivo, chave **`APPLYFLOW_APPLICATIONS_V1`** (`src/storage/application-storage.ts`), até **500** entradas (as mais recentes primeiro). Dedupe quando existe **`jobUrl`** (URL normalizada, sem `#hash`).

### Como salvar no painel

1. Na página Easy Apply do LinkedIn com o modal aberto, use o bloco **«Histórico local»** no painel ApplyFlow.
2. Escolha o **Estado rápido** (`Revisando`, `Aplicada`, …) — o valor **nunca** é inferido pela extensão; o predefinido ao abrir nova vaga é **Revisando**.
3. **«Salvar no histórico»** grava metadados derivados da página/snippet atual (titulo empresa aproximados, URL, fit heurístico, contagens de campos e da sessão de autofill). **Não** envia candidatura.
4. Se já existir registo para a mesma URL, o registo é **actualizado** (dedupe).

### Estados disponíveis

| Estado | Chave técnica |
|--------|----------------|
| Revisando | `reviewing` |
| Aplicada | `applied` |
| Ignorada | `ignored` |
| Aguardando resposta | `waiting_response` |
| Entrevista | `interview` |
| Teste técnico | `technical_test` |
| Recusada | `rejected` |
| Aprovada | `accepted` |

### Opções › Histórico

Lista com **período** (todos / 7 / 30 / 90 dias) e **estado**, **métricas locais** do funil e chip **«Parada 7+ dias»** na tabela quando aplicável. Notas com blur, alteração de estado, **Limpar histórico**. Exportações:

- **CSV (filtro)** e **JSON (filtro)** — respeitam período **e** estado actualmente seleccionados (a mesma lista que a tabela).
- **Backup JSON completo** — tudo em `chrome.storage` (metadados do modelo).

Colunas CSV: metadados + colunas de **job intelligence** (`seniority`, `roleType`, `workModel`, `contractType`, `englishRequired`, `detectedSkills` em formato `SkillA|SkillB`). Sem coluna de texto bruto da vaga.

## Sprint 4.2 — Job intelligence local (sem IA / sem backend)

- **Core:** `packages/applyflow-core/src/job-intelligence.ts` — `extractJobIntelligence(text)` com texto **normalizado** (PT/EN), lista fixa de **skills** detectadas, senioridade, tipo de papel, modelo de trabalho, contratação, menção a salário/faixa (heurística) e inglês exigido.
- **Persistência:** campo opcional **`jobMeta`** em `ApplyFlowApplication` — só etiquetas enums + lista deduplicada de skills (+ booleanos). **Não** grava texto completo da vaga nem respostas.
- **Painel:** cartão «Inteligência da vaga (local)» com resumo ao ver o modal com campos.
- **Opções › Histórico:** coluna **Intel** com chips compactos + secção de métricas agregadas (top skills, modelos de trabalho, contratação, inglês).

**Privacidade:** inferência apenas em excerto já carregado no browser para fit/histórico; sem envio ao servidor DevFlow/OpenAI.

**Limitações:** regex e palavras‑chave — falsos positivos/negativos; anúncios ambíguos podem ficar em `unknown`.

Documentação técnica: `docs/JOB_INTELLIGENCE.md`.

## Sprint 4.1 — Métricas locais e funil (sem backend)

Implementação em `src/storage/application-metrics.ts`:

- **`computeApplicationMetrics`** — calcula sobre o **mesmo conjunto** mostrado na tabela (**período** × **estado**; se o estado for «Todos», equivale a filtrar só por `createdAt`).
- **Filtro de período** com `getApplicationsByPeriod` (`all` | `7d` | `30d` | `90d`): critério **`createdAt` ≥ limite**.
- **`staleCount` / chip** — estados `reviewing`, `applied`, `waiting_response` com **`updatedAt`** há **≥ 7 dias** relativamente ao momento em que abre Opções → Histórico.
- Taxas (entrevista, teste técnico, aceite, recusado) são **contagens desse estado ÷ total visível** (`total === 0` ⇒ taxas 0). **Fit médio** apenas quando há `fitScore` numérico guardado.

**Privacidade:** apenas números derivados dos metadados que já tinha gravado — sem IA, sem rede, sem notificações de sistema nesta sprint.

**Sprint 4.2:** a mesma função de métricas incorpora **`skillsTop`**, contagens **`byRoleType`**, **`byWorkModel`**, **`byContractType`** e **`englishRequiredCount`** quando existirem `jobMeta` nos registos.

### O que **é** guardado

- `id`, `createdAt`, `updatedAt`, `source` (= `linkedin`)
- `jobTitle`, `companyName` (truncados para armazenamento seguro), `jobUrl`
- `status`, `fitScore` (heurística local sobre texto limitado raspado apenas para calcular score — não persiste esse texto integral)
- `fieldsDetected`, `fieldsFilled`, `blockedCount`, `failedCount`
- `notes` (opcional, editável nas Opções — truncado)
- **`jobMeta`** (opcional, Sprint 4.2): `seniority`, `roleType`, `workModel`, `contractType`, `englishRequired`, `salaryMentioned`, `detectedSkills` — derivados de `extractJobIntelligence` sobre excerto limitado (≤16k) no momento de **Salvar no histórico**

### O que **não** é guardado

- Texto integral da página da vaga
- Sugestões, respostas Easy Apply ou **carta/cover letter completas**
- **Salário** que tenha sido preenchido no formulário
- Rotulos ou valores completos de campos (`suggestedValue`, etc.)

### Garantia — ApplyFlow não envia candidatura

O histórico é **lista local** opcionalmente preenchida por si. Submit / Next continuam apenas no próprio LinkedIn.

### Como limpar o histórico

- Nas **Opções** › **Histórico** → **Limpar histórico**, ou remover a entrada `APPLYFLOW_APPLICATIONS_V1` em `chrome.storage.local` pelo DevTools da extensão.

### Debug

Com `localStorage.APPLYFLOW_DEBUG = "true"` na origem onde corre o código (painel/consola aplicável):

- gravar candidatura (`application saved`), actualização de estado, exclusão e dedupe por URL são registados como metadados (sem valores de formulário).

Documentação complementar: `docs/HISTORICO_LOCAL.md`, `docs/JOB_INTELLIGENCE.md`.

## Content script empacotado (Sprint 2.1)

Build em dois passes (`vite.config.content.ts` depois `vite.config.ts`): `content.js` em **IIFE** monolítico; options/service worker preservam esse ficheiro.

## Instalar e build

```bash
pnpm install
pnpm --filter applyflow-extension build
```

Saída: **`apps/applyflow-extension/dist/`**.

## Testes

```bash
pnpm --filter applyflow-extension test
```

## Carregar no Chrome

`chrome://extensions` → modo programador → **Carregar sem compactação** → pasta `apps/applyflow-extension/dist`.

## Checklist manual Sprint 3 (autofill)

1. `pnpm --filter applyflow-extension build`
2. Recarregar a extensão em `chrome://extensions`
3. Abrir uma candidatura **Easy Apply** e o modal até aparecer perguntas
4. Com o painel ApplyFlow à direita, usar **Preencher** num campo **number** — confirmar número no formulário
5. Para um cartão **low** ou **`unknown`**: confirmar o fluxo **Confirmar preenchimento** → **Preencher (confirmado)**
6. **textarea**, **radio** e **select** quando existirem — se erro, usar **Copiar**
7. Verificar contadores na **sessão** e usar **Limpar sessão**
8. Verificar conscientemente que o ApplyFlow **não** clicou em **Submit** nem em **Next**

## Checklist manual Sprint 4 (histórico local)

1. Painel › **Histórico local**: escolher estado → **Salvar no histórico** → mensagem «Salvo no histórico».
2. Recarregar página / reabrir painel para a mesma vaga → confirmar dedupe pela URL (se disponível).
3. Opções › **Histórico**: **período** e **estado**; verificar **cartões de métricas** e linhas com chip **Parada 7+ dias** (crie um registo antigo com estado «Revisando» e `updatedAt` simulado há 8+ dias usando devtools se necessário).

## Checklist manual Sprint 4.1 (métricas e export)

1. Mudar **Últimos 7 / 30 / 90 dias** e confirmar que os **totais da grelha de métricas** e a **tabela** se alinham (a tabela também filtra pelo **estado**, se não for «Todos»).
2. **Exportar CSV (filtro)** e **JSON (filtro)** com um estado específico seleccionado → ficheiro deve ter apenas as linhas visíveis.
3. **Backup JSON completo** deve incluir todos os registos no storage, independentemente do filtro na UI.
4. Confirmar que **nenhuma** métrica faz pedidos de rede.

## Checklist manual Sprint 4.2 (job intelligence)

1. No Easy Apply com painel em **campos**, verificar o cartão **Inteligência da vaga** (linha tipo Senioridade · papel · modelo · inglês · skills).
2. **Salvar no histórico** e na página **Opções › Histórico** validar chips na coluna **Intel** e métricas agregadas quando existirem dados.
3. **Exportar CSV** e confirmar colunas `seniority`, `detectedSkills` (pipes) **sem** coluna de texto bruto integral.

## Checklist manual Sprint 5 (IA)

1. **Opções › IA** — activar IA, colar API key de teste, **Guardar**; opcionalmente **Testar configuração**.
2. Abrir Easy Apply com campos; no cartão de texto longo ou «desconhecido» relevante, confirmar **«Gerar com IA»** só após clique.
3. Ver **loading**, texto gerado, **Copiar**, **Preencher com texto IA** (respeita safety gate), **Regerar**, **Limpar IA**.
4. No cartão **Fit**, gerar **resumo em bullets** — apenas copiar/limpar (sem preencher formulário).
5. Confirmar no **histórico de candidaturas** que **não** aparece texto gerado pela IA.
6. Em `chrome.storage.local`, verificar `APPLYFLOW_AI_AUDIT_V1` sem payloads completos.

## Limitações conhecidas

- Auditoria só para diagnóstico local; **`reason`** é truncada.
- Histórico de auditoria capado a **100** entradas.
- Histórico de candidaturas capado a **500** registos; dedupe apenas por **`jobUrl`** quando existir.
- **Métricas 4.1** dependem de `createdAt` / `updatedAt` correctos; período **«90d»** não mostra entradas antes do limite mesmo que ainda existam no storage.
- **Job intelligence 4.2** é heurístico — classificações `unknown`, skills em falta ou ruídos em anúncios mistos são normais.
- **Sprint 5 — IA:** dados enviados à OpenAI saem do browser; custos e disponibilidade dependem da conta OpenAI; possível variação de qualidade do modelo.
- **Limpar sessão ≠ limpar auditoria** (ver secção Auditoria); **Limpar histórico** (Sprint 4) é separado.

## Planeamento técnico

`docs/AUTOFILL_ASSISTIDO.md` (Sprint 3 + **3.1**), `docs/HISTORICO_LOCAL.md` (Sprint **4**–**4.2**), `docs/JOB_INTELLIGENCE.md`, `docs/IA_OPT_IN.md` (Sprint **5**).

## Segurança e ética

Envio humano; sem mass apply; sem rodeio de CAPTCHA.
