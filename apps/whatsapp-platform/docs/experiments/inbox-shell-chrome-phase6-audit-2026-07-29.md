# Auditoria — Fatia 6 · Chrome do `InboxShell`

Data: **2026-07-29**  
Branch base: `main` @ `174adf89` (merge [#167](https://github.com/devflow-modules/devflow/pull/167) — Fatia 5 KEEP)  
Escopo: **auditoria documental apenas** — nenhum componente, estilo, handler, filtro, URL ou teste alterado  

Pré-condições:

| Check | Resultado |
|---|---|
| Fatia 1 lista | KEEP (#163) |
| Fatia 2 header | KEEP (#164) |
| Fatia 3 composer | KEEP (#165) |
| Fatia 4 contexto | KEEP (#166) |
| Fatia 5 banner + DealClose | KEEP (#167) @ `174adf89` |
| Definição canônica Fatias 5–6 | **PROCEED** (`inbox-slices-5-6-canonical-definition-2026-07-29.md` §5) |
| `main` local | `174adf89` |

Skills (coordenadas, advisory): `product-grill`, `frontend-design`, `revenue-centric-design`, `nextjs-ui-polish`, `whatsapp-platform-safe-change`, `devflow-product-evidence`, `test-hardening`.

Legenda: **FACT** · **HYP** · **UNKNOWN** / `BLOCKED_BY_PRODUCT_DECISION`

---

## 1. Resumo executivo

Ao entrar na Inbox, o operador encontra a fila densificada (KEEP 1) **depois** de atravessar um stack de chrome operacional: PageHeader (título/descrição/actions), toasts de ativação, pricing hints, `<details>` de métricas/equipa, faixa “Conversas”, e — dentro da lista — prospect bar (admin), 7 chips de fase, refinamento linha/fila, alertas stale e sticky groups.

**Problema operacional (FACT + HYP):** o job canônico da Fatia 6 é *encontrar a fila densificada sem atravessar um dashboard* que reconstitui “camadas demais”. O **modo foco** já esconde pricing, métricas shell e prospect bar, mas é opt-in; no default o stack permanece.

**Job do operador neste chrome:**

1. orientar-se na Inbox (título / realtime / foco);  
2. ver métricas/equipa ou assumir próxima **quando necessário**;  
3. filtrar a fila **sem** que o chrome visual rivalize com a lista;  
4. **não** redesenhar KEEP 1–5 nem alterar contratos de filtro/URL/sort/sticky.

**Decisão desta auditoria:** `PROCEED_TO_VISUAL_PROPOSAL` — inventário e contratos fechados; decisões de produto (§17) entram como opções A/B ou bloqueios, não como regras inventadas.

---

## 2. Escopo e fontes examinadas

### Em escopo (definição canônica §5)

- `InboxShell.tsx` — PageHeader / título / descrição, toasts de ativação (apresentação), hints de pricing, modo foco.  
- `InboxMetricsPanel` e revelação (`<details>`).  
- Densidade visual do chrome de filtros **sem** alterar contratos de filtro, URL, sticky groups ou sort.  
- Relação com modo foco (Fatias 3–4).

### Fora de escopo

- Lógica de filtros, query string, ordenação SLA, agrupamento.  
- Redesign da row (KEEP 1).  
- Coluna da conversa (KEEP 2–5).  
- Prospect metrics bar / gating admin — **default: não mover regras**; só se overlap visual for aceite no gate.  
- Navegação global do app shell (fora da Inbox), salvo densidade já existente.  
- Timeline / Mais a11y / rascunho / C5–C7 (adiados na definição §6).

### Fontes (FACT)

| Fonte | Path |
|---|---|
| Definição | `docs/experiments/inbox-slices-5-6-canonical-definition-2026-07-29.md` |
| Shell | `src/components/inbox/InboxShell.tsx` |
| Métricas | `src/components/inbox/InboxMetricsPanel.tsx` |
| Lista / filter chrome | `src/components/inbox/ConversationsList.tsx` |
| Prospect bar | `src/components/inbox/InboxProspectMetricsBar.tsx`, `lib/devflowProspecting.ts` |
| PageHeader | `src/components/ui/page-header.tsx` |
| Página | `src/app/(protected)/inbox/page.tsx` |
| Focus consumidor | `ChatWindow.tsx` (KEEP 3–5) |
| APIs | `app/api/inbox/metrics`, `team`, `queue/next`; `inboxFetch.ts` |
| E2E / a11y | `tests/e2e/inbox.spec.ts`, `tests/a11y/*` |
| Unit lista | `src/components/inbox/__tests__/inboxUi.test.tsx` |

---

## 3. Fluxo actual: entrada → lista

```text
/inbox (Suspense)
  → InboxShell [data-testid=inbox-shell]
       [banner PENDING_ACTIVATION?]
       PageHeader: Atendimento / Inbox / description? / actions
       [toasts ativação?]
       [pricing hints?]          ← hidden se focus
       [<details> Métricas]      ← unmounted se focus
       split:
         aside:
           “Conversas” + OnlineUsersBadge
           ConversationsList
             [prospect bar?]     ← hidden se focus / não admin
             7 chips fase
             [linha/fila?]
             [stale alerts?]
             sticky groups + rows KEEP 1
         chat: ChatWindow KEEP 2–5 | empty | FirstConversationHint
```

---

## 4. Inventário de componentes (chrome)

| Componente | Papel | Montagem |
|---|---|---|
| `InboxShell` | Orquestra chrome + lista + chat | `/inbox` |
| `PageHeader` | eyebrow / h1 / description / actions | Topo shell |
| Toasts ativação | 1ª mensagem / 1ª resposta / gate | Condicional |
| `PricingContextHint` | Caps / upgrade | Até 2; !focus && !white-label |
| `<details>` + `InboxMetricsPanel` | Métricas + equipa + Assumir próxima | !focus |
| Aside label + `OnlineUsersBadge` | Chrome coluna lista | Sempre (quando sidebar) |
| `ConversationsList` filterChrome | Prospect / chips / linha-fila | Na lista |
| Alertas stale + sticky | Acima das rows | Na lista |

---

## 5. Anatomia `InboxShell` (topo → baixo) — FACT

| # | Região | Condicionantes |
|---|---|---|
| 1 | Banner canal em ativação | `PENDING_ACTIVATION` |
| 2 | PageHeader — padding menor em focus; description omitida em focus | — |
| 2a | Actions: Menu compacto (lg), **Modo foco**, pill realtime, Ajuda, Ajustes | — |
| 3 | Toasts / gate ativação | flags de onboarding |
| 4 | Pricing hints | `!inboxFocusMode && !isWhiteLabelMode()` |
| 5 | `<details>` “Métricas e equipa” (fechado por omissão) | `!inboxFocusMode` |
| 6 | Split lista + chat | mobile: lista **ou** chat |

**FACT:** `PageHeader` usa `layout="split"`, `size="compact"`, `showDivider={false}`.

---

## 6. `InboxMetricsPanel` — FACT

### Conteúdo

| Bloco | Dado |
|---|---|
| Card fila | `avgQueueWaitSeconds` + sample |
| Card atendimento | `avgHandleSeconds` + sample |
| Card abertas | soma `conversationsByAgent.openThreads` |
| CTA | **Assumir próxima** → `fetchInboxQueueNext(true)` → `onOpenThread` |
| Breakdown | até 5 agentes |
| Equipa | `AgentStatusBadge` + `activeThreadCount` |

### Revelação

- Shell: `<details>` **fechado** por omissão; **desmontado** em focus.  
- **FACT:** filhos React montam com details fechado → `useQuery` metrics/team **correm mesmo fechado** (não é lazy-on-open).  
- Período UI fixo `days=30`.

### Auth API

`ROLES_OPERATIONAL` (operator | manager | platform_admin) em `/api/inbox/metrics`, `/team`, `/queue/next`. UI do painel **sem** gate de role extra.

---

## 7. Chrome de filtros vs contratos (NÃO TOCAR lógica)

### Contratos invariantes — fora de Fatia 6

| Contrato | Comportamento (FACT) |
|---|---|
| Fases `InboxConversationsFilter` | 7 valores; default estado `"needs_response"` |
| API lista | `phase`, `businessPhoneNumberId`, `queueId`, `priority`, `prospectLens`, `limit=100` |
| URL | lê `filter` legacy / `phase` / `priority`; escreve `businessPhoneNumberId`, `thread` |
| Clique fase | `setFilter` + limpa `prospectLens`; **não** escreve `phase` na URL |
| Sort | `sortThreadsForSidebar` (SLA) |
| Sticky groups | `INBOX_SIDEBAR_SECTION_ORDER` + `sticky top-0` |
| `queueFilter` / `prospectLens` | estado local (sem sync URL) |
| `priorityFilter` | entra pela URL; **sem UI** de prioridade na lista |

**FACT crítico:** ao mudar `searchParams`, o effect do shell recalcula fase; se URL sem `phase`/`filter`, **default `"needs_response"`**. Fatia 6 **não** “corrige” isto de passagem.

### Chrome visual (densidade em escopo; handlers intactos)

Dentro de `ConversationsList` `filterChrome`:

1. `InboxProspectMetricsBar` (admin + env)  
2. 7 chips (`data-testid="inbox-filter-*"`)  
3. Row Linha / Fila  
4. (depois) alertas stale; sticky headers; rows KEEP 1  

---

## 8. Modo foco (relação Fatias 3–4) — FACT

| Focus ON | Efeito |
|---|---|
| Header | padding menor; description omitida |
| Pricing | oculto |
| Details métricas | **unmounted** |
| Prospect bar | `hideProspectMetrics` |
| Chat | `compactChrome` + `inboxFocusMode` → KEEP 3–5 densos; CRM off salvo `evaluationMode` |

**FACT:** focus é **opt-in** (`localStorage` `"df-inbox-focus-mode"`, default false até ler storage).  
**FACT:** em focus **permanecem** chips de fase, alertas stale, sticky groups, PageHeader title/actions, toasts de ativação.

---

## 9. Prospect metrics — overlap

| Peça | Gate | Posição | Focus |
|---|---|---|---|
| `InboxMetricsPanel` | API operational; UI se !focus | Acima do aside | oculto |
| `InboxProspectMetricsBar` | `platform_admin` + env | Acima dos chips | oculto |

**FACT:** duas superfícies de “métricas” competem acima da fila quando focus off + admin prospect.  
**Canônico:** default **não mover** regras de prospect; overlap visual → decisão de gate (§17), não resolução nesta auditoria.

---

## 10. Matriz de estados

| Estado | Chrome shell | Lista |
|---|---|---|
| Onboarding 0 threads | Header + hints possíveis | empty sem filterChrome |
| Empty com filtro | Completo | filterChrome + `InboxFilterEmpty` |
| Loading lista | Completo | skeleton **substitui** filterChrome |
| `evaluationMode` (FREE) | Não esconde PageHeader/métricas/pricing | CRM permanece no chat se focus |
| White-label | Sem pricing | — |
| Focus on | Sem pricing/métricas/prospect | Chips + stale + sticky |
| Mobile | Chrome acima quando sidebar | lista **ou** chat |
| Canal pending | Banner topo | — |

**UNKNOWN:** copy exacta dos pricing hints (depende de `/api/billing/ui`).

---

## 11. Ordem de atenção (primeira viewport)

Com focus **off**, tipicamente antes das rows KEEP 1:

1. PageHeader (eyebrow + título + description + 4–5 actions)  
2. Toasts ativação (se on)  
3. Pricing (1–2)  
4. Details “Métricas e equipa” (+ painel se aberto)  
5. “Conversas” + online  
6. Prospect bar (admin)  
7. 7 chips  
8. Linha/fila  
9. Stale  
10. Sticky group  
11. Rows densificadas  

**HYP alinhada ao job:** Fatia 6 deve fazer a **lista** ser o âncora da primeira viewport; chrome secundário sob demanda ou densificado — **sem** tocar contratos §7.

---

## 12. Cobertura de testes

| Área | Situação |
|---|---|
| Unit `InboxShell` / focus / details | **Ausente** |
| Unit `InboxMetricsPanel` | **Ausente** |
| Unit prospect bar | **Ausente** |
| `ConversationsList` filtros / empty / row | `inboxUi.test.tsx` |
| E2E filtros / `inbox-shell` | `inbox.spec.ts`, a11y |
| KEEP 5 banner/deal | Fora Fatia 6 |

**Gap principal:** zero regressão automatizada para revelação de métricas, modo foco no shell, ou densidade do chrome acima da lista.

---

## 13. a11y (FACT / gaps)

| Elemento | Facto |
|---|---|
| PageHeader | `<header>` + `<h1>Inbox` |
| Activation / pending | `role="status"` / `region` |
| Linha/Fila | `aria-label` |
| Prospect bar | `role="toolbar"` |
| Stale crítico | `role="alert"` |
| Modo foco / Menu compacto | texto do botão + `title`; sem `aria-pressed` |
| Details métricas | summary nativo; sem testid / `aria-controls` |
| Online badge | só `title` |
| Axe inbox | existe em a11y; **não** cobre focus/details abertos de forma explícita |

**UNKNOWN:** resultado axe neste HEAD (não reexecutado nesta auditoria).

---

## 14. Invariantes funcionais (não quebrar na implementação)

1. Contratos de filtro / API / URL / sort / sticky (§7) intactos.  
2. testids `inbox-shell`, `inbox-filter-*`, `inbox-line-filter`.  
3. Modo foco continua a funcionar para KEEP 3–5 (CRM/composer/header densos).  
4. APIs metrics/team/queue/next e roles operational.  
5. Prospect gating admin + env **sem mudança silenciosa**.  
6. KEEP 1–5 sem redesign.  
7. Sem novas rotas / middleware.

---

## 15. Riscos da futura densificação

| Risco | Severidade | Mitigação |
|---|---|---|
| Alterar sync URL `phase` “de passagem” | Alta | Fora de escopo explícito |
| Default focus sem aceite | Alta (produto) | Gate A/B |
| Esconder Assumir próxima | Média | Manter capacidade acessível |
| Mexer prospect bar sem gate | Média | Canónico: default não mover |
| Densificar chips e mudar semântica de filtro | Alta | Só CSS/layout |
| Fetch metrics mesmo fechado → custo | Baixa–média | Opcional lazy na proposta |

---

## 16. Classificação hierárquica (para proposta)

| Elemento | Classe actual | Nota |
|---|---|---|
| Rows KEEP 1 | PRIMARY (alvo) | Já densificadas |
| Chips fase | ALWAYS + CONTRACT | Densidade visual só |
| PageHeader title | ALWAYS | Densificar copy/actions |
| Description | STATE / REVEAL | Já some em focus |
| Modo foco | ACTION | Opt-in hoje |
| Details métricas | REVEAL (summary) + fetch always | Em focus: off |
| Pricing | STATE | Hidden em focus |
| Toasts ativação | STATE | Apresentação |
| Prospect bar | GATED + REVEAL via focus | Default não mover regras |
| Stale / sticky | STATE / STRUCTURE | Decisão se entram na Fatia 6 |

---

## 17. Decisões de produto bloqueadas (gate)

| ID | Questão | Estado |
|---|---|---|
| **S6-1** | Métricas: manter details + fetch fechado vs lazy / default mais agressivo | Aberto |
| **S6-2** | Modo foco: continuar opt-in vs default operacional | Aberto |
| **S6-3** | Prospect bar na Fatia 6 ou isolada | Canónico: default **não mover** |
| **S6-4** | Alertas stale + sticky: densidade Fatia 6 ou residual lista | Aberto |
| **S6-5** | Faixa “Conversas” + online: chrome 6 ou residual | Aberto |
| **S6-6** | Toasts ativação vs “primeira viewport = lista” | Aberto (só apresentação) |
| **S6-7** | Pricing hints: sob demanda vs manter | Aberto |
| **S6-8** | Link Ajustes no header (incl. operator) | Aberto |
| **S6-9** | Assumir próxima: hierarquia no painel vs só row | Aberto |
| **S6-10** | Chips: só densidade CSS vs reagrupar UI **sem** mudar contratos | Aberto |
| **S6-11** | Sync URL `phase` | **Fora** Fatia 6 — invariante ou ticket separado |

---

## 18. Hipóteses que exigirão gate humano

1. **HYP:** A primeira viewport deve privilegiar chips + lista; PageHeader e métricas sob demanda ou uma linha.  
2. **HYP:** Focus já prova o valor de esconder métricas/pricing — a Fatia 6 pode densificar o default **sem** forçar focus.  
3. **HYP:** Prospect bar fica fora do diff salvo aceite S6-3.  
4. **HYP:** Testes shell (focus + details) são pré-requisito de evidência.

---

## 19. Escopo seguro de uma futura proposta visual

**Pode propor:**

- Densidade PageHeader / actions / description.  
- Hierarquia do `<details>` métricas (e opcionalmente lazy fetch).  
- Densidade visual dos chips / refinement **sem** mudar handlers/URL.  
- Apresentação de toasts/pricing (colapso / timing).  
- Opções A/B para S6-1…S6-10.  
- Plano de testes unitários do shell.

**Não pode resolver só na proposta sem gate:**

- Mudar contratos §7 / S6-11.  
- Redesign KEEP 1–5.  
- Mover prospect gating sem S6-3.  
- Tornar focus default sem S6-2 aceite.

---

## 20. Critérios para avançar

- [x] Inventário shell + métricas + filter chrome  
- [x] Contratos URL/filtro/sort/sticky marcados como intocáveis  
- [x] Focus e overlap KEEP 1 / prospect documentados  
- [x] Gaps de teste e a11y  
- [x] S6-* bloqueados, não inventados  
- [x] Isolamento: **zero** diff de produto nesta etapa  
- [ ] Aceite humano da **proposta visual** Fatia 6  

---

## 21. Decisão final

### `PROCEED_TO_VISUAL_PROPOSAL`

Auditoria documental da Fatia 6 completa em `main` @ `174adf89`.  
Próximo passo: **proposta visual Fatia 6** (opções A/B para S6-*; contratos intactos; sem código até **PROCEED**).

| Decisão | Significado |
|---|---|
| **PROCEED** | Aceitar auditoria; autorizar só proposta visual Fatia 6 |
| **ITERATE** | Emendar inventário / bloqueios |
| **BLOCK** | Não avançar |

---

## Apêndice A — Respostas ao job canônico

1. **Caminho actual:** header → (toasts/pricing/métricas) → conversas → (prospect/chips/…) → rows KEEP 1.  
2. **O que atrasa a fila:** stack administrativo default; focus só se o operador o activar.  
3. **O que já ajuda:** details fechado; focus esconde pricing/métricas/prospect; KEEP 1 densificou rows.  
4. **Fora desta fatia:** KEEP 2–5, timeline, URL phase sync, regras prospect (salvo gate).

---

## Apêndice B — Confirmação de isolamento

- Diff de produto: **nenhum**  
- Único artefacto: este documento sob `docs/experiments/`  
- Commit / push / PR: **não** nesta etapa  
- Implementação Fatia 6: **não autorizada**

---

## Apêndice C — Referências

- Definição: `inbox-slices-5-6-canonical-definition-2026-07-29.md` §5  
- Fatia 5 KEEP: `inbox-banner-dealclose-phase5-density-impl-2026-07-29.md`  
- PRs KEEP: #161, #163–#167  
- `main`: `174adf89`
