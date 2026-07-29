# Proposta visual — Fatia 6 · Chrome do `InboxShell`

Data: **2026-07-29**  
Base: [Auditoria Fatia 6](./inbox-shell-chrome-phase6-audit-2026-07-29.md) (`PROCEED_TO_VISUAL_PROPOSAL`)  
Pré-condição: `main` @ `174adf89` · Fatias **1–5 KEEP** · Definição canônica §5  
Escopo: **proposta documental + wireframes** — sem código, commit, push ou PR  

Skills (coordenadas, advisory): `product-grill`, `frontend-design`, `revenue-centric-design`, `nextjs-ui-polish`, `whatsapp-platform-safe-change`, `devflow-product-evidence`, `test-hardening`.

Legenda: **FACT** · **HYP** · `BLOCKED_BY_PRODUCT_DECISION`

---

## 1. Resumo executivo

Após KEEP 1–5, a **fila densificada** ainda fica atrás de um stack de chrome (PageHeader, toasts, pricing, métricas, filtros). O job canônico é: *ao entrar, encontrar a lista sem atravessar um dashboard*.

**Princípio:** a primeira viewport operacional privilegia **chips + lista (KEEP 1)**; título, métricas, pricing e toasts são apoio — densificados ou sob demanda — **sem** alterar filtros/URL/sort/sticky e **sem** presumir flips de produto (S6-*).

**Direção recomendada:** Alternativa **B — Shell progressivo, lista primeiro**  
- PageHeader numa linha compacta; description omitida no default operacional (como focus já faz).  
- Métricas: manter `<details>` fechado + **fetch actual** (lazy = **bloqueado** até gate S6-1).  
- Focus: permanece **opt-in** (S6-2-A).  
- Prospect bar / gating: **não mover** (S6-3).  
- Chips: só densidade CSS (S6-10-A); contratos intactos.  
- Stale + sticky: densidade tipográfica leve **ou** residual lista (S6-4 default = residual / só CSS).  
- Alternativa A = só reduzir padding/tipografia sem mudar hierarquia.

**Decisão desta proposta:** `PROCEED` (gate humano antes de código) — ver §24 checkboxes S6-*.

---

## 2. Pré-condições e evidências

| Item | Estado |
|---|---|
| Auditoria Fatia 6 | Lida na íntegra |
| Definição canônica §5 | Aceite na série 5–6 |
| KEEP 1–5 | #163–#167 @ `174adf89` |
| Código (FACT) | PageHeader + details métricas + filterChrome; focus opt-in |
| Working tree esperado | auditoria + este ficheiro; **zero** diff produto |

---

## 3. Diagnóstico confirmado

**FACT** (auditoria):

- Stack default: header → toasts? → pricing? → details métricas → “Conversas” → prospect?/chips/linha-fila/stale/sticky → rows KEEP 1.  
- Focus esconde pricing, métricas shell e prospect bar; **não** é default.  
- Details fechado; queries metrics/team **correm mesmo fechados**.  
- Contratos fase/URL/sort/sticky intocáveis (S6-11 fora).  
- Sem testes unitários de shell/métricas.

**Não é o problema:** ausência de filtros, métricas ou focus — existem; o problema é hierarquia na primeira viewport.

---

## 4. Objetivos e princípios

1. **Lista KEEP 1 = prioridade visual** da primeira viewport.  
2. Progressive disclosure do chrome secundário.  
3. **Sem remoção de capacidade** — só densidade / revelação / apresentação.  
4. Contratos filtro/URL/sort/sticky **intactos**.  
5. KEEP 1–5 intactos.  
6. S6-1…S6-11 explícitos; **lazy métricas bloqueado** sem aceite S6-1.  
7. Tokens `df-*`, testids `inbox-shell`, `inbox-filter-*`, `inbox-line-filter`.

---

## 5. Anatomia atual (FACT)

```text
[banner PENDING?]
PageHeader (eyebrow + Inbox + description + actions)
[toasts ativação?]
[pricing ×1–2?]
<details> Métricas e equipa   ← fetch sempre se montado
aside: Conversas + online
  [prospect bar admin?]
  7 chips fase
  [linha / fila?]
  [stale?]
  sticky groups
  rows KEEP 1
chat KEEP 2–5
```

---

## 6. Hierarquia visual pretendida

| Prioridade | Superfície |
|---|---|
| 1 | Rows KEEP 1 (+ sticky mínimo necessário) |
| 2 | Chips de fase (contrato) — densos |
| 3 | Refinamento linha/fila (se aplicável) |
| 4 | PageHeader compacto (título + actions essenciais) |
| 5 | Details métricas (summary) |
| 6 | Pricing / toasts (STATE) |
| 7 | Prospect bar (GATED — fora do flip salvo S6-3) |

---

## 7. Matriz de classificação (proposta)

| Elemento | Classe alvo | Gate |
|---|---|---|
| Rows KEEP 1 | PRIMARY | — |
| Chips fase | ALWAYS + CONTRACT | S6-10 densificar CSS only (rec.) |
| Linha/fila | STATE | Densidade só |
| PageHeader title | ALWAYS compact | — |
| Description | OMIT default / REVEAL | Como focus; sem exigir focus |
| Modo foco | ACTION opt-in | **S6-2-A** (rec.) |
| Details métricas | REVEAL summary | **S6-1-A** keep fetch (lazy **BLOCKED**) |
| Assumir próxima | Dentro details | **S6-9-A** keep no painel |
| Pricing | STATE densificado ou sob details | **S6-7** |
| Toasts | STATE compacto | **S6-6** |
| Prospect bar | GATED intacto | **S6-3** não mover |
| Stale / sticky | Residual lista + CSS leve | **S6-4-A** |
| “Conversas” + online | Compactar | **S6-5-A** densificar in-place |
| Ajustes link | Manter | **S6-8-A** |
| URL `phase` sync | OUT | **S6-11** |

---

## 8. Alternativa A — Conservadora

### Ideia

Diff mínimo: reduzir padding/tipografia do PageHeader, summary métricas e chips; **não** omitir description; **não** mudar focus default; fetch métricas igual; prospect/stale/pricing intactos em comportamento.

### Mudanças propostas

1. PageHeader: `py` menor; actions mais apertadas; description mantida (tipografia menor).  
2. Details: summary mais fino; painel interno com gap menor.  
3. Chips: `py`/`px` ligeiramente menores; mesmos 7 botões e testids.  
4. Faixa “Conversas”: tipografia menor.  
5. Sem lazy fetch; sem focus default; sem mover prospect.  
6. Testes shell mínimos (mount + focus toggle smoke) opcionais na PR.

### Avaliação

| Critério | Nota |
|---|---|
| Lista na 1ª viewport | ↑ ligeira |
| Contratos | Intactos |
| S6-* flips | Nenhum |
| Diff / risco | Baixos |
| Job canônico | Parcial |

---

## 9. Wireframes — Alternativa A

```text
┌ Atendimento · Inbox · (description curta) · [Foco][RT][Ajuda][Ajustes]
├ ▸ Métricas e equipa
├ Conversas · online
├ [chips densos ×7]
├ rows KEEP 1 …
└ chat KEEP …
```

---

## 10. Alternativa B — Shell progressivo, lista primeiro (recomendada)

### Ideia

Aproximar a hierarquia do **modo foco** no default visual **sem** activar focus por defeito: menos chrome permanente, métricas sob summary, descrição omitida, chips+lista sobem na viewport. Flips de produto só via checkboxes.

### Composição recomendada (defaults de gate)

```text
┌ Inbox · [Modo foco][Tempo real][Ajuda][Ajustes]     ← sem eyebrow/description
├ ▸ Métricas e equipa                                 ← fechado; fetch ACTUAL
├ Conversas · online                                  ← 1 linha fina
├ [chips ×7 densos]                                   ← contratos iguais
├ [linha/fila se multi]
├ rows KEEP 1 …                                       ← âncora visual
└ chat KEEP 2–5
```

Toasts/pricing: se activos, **faixa compacta** abaixo do header (não rivalizam com chips); ver S6-6/S6-7.

Prospect bar: **inalterada** (S6-3).

### Mudanças propostas (B)

**PageHeader**

1. Default: título “Inbox” + actions; **omitir** eyebrow e description (HYP alinhada ao focus).  
2. Actions densas; Modo foco com `aria-pressed` (polish a11y).  
3. Menu compacto / realtime / Ajuda / Ajustes mantidos (S6-8-A).

**Métricas (S6-1)**

4. **S6-1-A (obrigatório nesta proposta):** manter `<details>` fechado + **fetch actual** (sem lazy).  
5. Summary uma linha; conteúdo interno densificado; Assumir próxima permanece no painel (S6-9-A).  
6. **S6-1-B lazy:** documentado como opção — **BLOCKED** até checkbox explícito no PROCEED.

**Focus (S6-2)**

7. **S6-2-A:** opt-in (FACT actual) — recomendado.  
8. **S6-2-B** default on: só com aceite; fora do caminho B default.

**Prospect (S6-3)**

9. **Não mover** regras/UI de gating; zero diff salvo aceite explícito.

**Filtros (S6-10)**

10. **S6-10-A:** só CSS/padding nos 7 chips + refinement; mesmos handlers/testids/ordem.  
11. Reagrupar UI (S6-10-B): **não** no default B.

**Stale / sticky (S6-4)**

12. **S6-4-A:** residual da lista; no máximo tipografia/padding; sem mudar sticky contract.  
13. Tratar como chrome Fatia 6 estrutural: só com aceite.

**Conversas + online (S6-5)**

14. **S6-5-A:** densificar in-place (altura de uma linha).

**Toasts (S6-6)**

15. **S6-6-A:** manter comportamento; apresentação mais compacta (menos padding).  
16. Adiar/colapsar automaticamente: só com aceite.

**Pricing (S6-7)**

17. **S6-7-A:** manter quando !focus; densificar.  
18. Meter sob details / esconder no default SaaS: só com aceite.

**S6-11**

19. Fora — não mencionar como “fix” na implementação.

**Testes**

20. Unit: focus toggle esconde metrics/pricing; details summary presente; chips testids.  
21. E2E existentes de filtro intactos.

---

## 11. Gates S6-1…S6-11 (opções)

| ID | Opção A (default rec. B) | Opção B | BLOCK / fora |
|---|---|---|---|
| **S6-1** Métricas fetch | **A** keep fetch fechado | Lazy on open | Lazy **BLOCKED** sem aceite B |
| **S6-2** Focus | **A** opt-in | Default on | — |
| **S6-3** Prospect | **A** não mover | Incluir densificação UI | Sem A → não tocar |
| **S6-4** Stale/sticky | **A** residual + CSS leve | Chrome Fatia 6 estrutural | — |
| **S6-5** Conversas/online | **A** densificar | Remover/ocultar | Remover = aceite |
| **S6-6** Toasts | **A** compactar | Adiar/colapsar | — |
| **S6-7** Pricing | **A** densificar !focus | Sob demanda / esconder | — |
| **S6-8** Ajustes | **A** manter | Gate por role | — |
| **S6-9** Assumir próxima | **A** no painel métricas | Só na row | — |
| **S6-10** Chips | **A** CSS only | Reagrupar UI | Reagrupar = aceite |
| **S6-11** URL phase | — | — | **Fora** Fatia 6 |

---

## 12. Wireframes — Alternativa B

### B1 — Default SaaS, focus off, sem toasts/pricing

```text
┌ Inbox                    [Modo foco] [● Tempo real] [Ajuda] [Ajustes]
├ ▸ Métricas e equipa
├ Conversas · 2 online
├ [Precisa resp.][…][…][…][…][…][…]     ← 7 chips densos
├ Cliente Alfa · badge · preview …
├ Cliente Beta …
└ │ chat KEEP │
```

### B2 — Details métricas aberto (capacidade preservada)

```text
├ ▼ Métricas e equipa
│   fila · atendimento · abertas · [Assumir próxima]
│   equipa …
├ Conversas …
├ chips …
```

### B3 — Focus ON (inalterado em regras; shell já esconde pricing/métricas/prospect)

```text
┌ Inbox (compact)          [Sair modo foco] …
├ Conversas …
├ chips …                  ← permanecem (FACT)
├ rows …
└ chat denso KEEP 3–5
```

### B4 — Admin prospect (S6-3: bar intacta)

```text
├ Conversas …
├ [prospect metrics bar — SEM mudança de regras]
├ chips …
├ rows …
```

### B5 — Toast + pricing activos (S6-6-A / S6-7-A)

```text
┌ Inbox · actions
├ [toast compacto 1ª mensagem]
├ [pricing hint compacto]
├ ▸ Métricas …
├ chips + lista …
```

### B6 — Mobile (sidebar)

```text
┌ Inbox · actions (wrap)
├ ▸ Métricas
├ chips
├ rows KEEP 1
(sem chat até selecionar — FACT)
```

---

## 13. Comparação A vs B

| Critério | A | B |
|---|---|---|
| Altura até 1ª row | ↓ pequena | ↓ material |
| Description permanente | Sim | Não (default) |
| Lazy métricas | Não | Não (bloqueado) |
| Focus default | Não | Não |
| Prospect | Intacto | Intacto |
| Contratos filtro/URL | Intactos | Intactos |
| Alinhamento job | Fraco–médio | **Forte** |

---

## 14. Direção recomendada

**Implementar Alternativa B** com defaults:

```text
UI:        B
S6-1:      A (fetch actual; lazy BLOCKED)
S6-2:      A (focus opt-in)
S6-3:      A (não mover prospect)
S6-4:      A (stale/sticky residual + CSS leve)
S6-5:      A (densificar Conversas/online)
S6-6:      A (toasts compactos)
S6-7:      A (pricing densificado quando visível)
S6-8:      A (Ajustes mantido)
S6-9:      A (Assumir próxima no painel)
S6-10:     A (chips CSS only)
S6-11:     fora
```

Fallback: **PROCEED com A** se o gate quiser risco mínimo.

---

## 15. Before / after esperado (B + defaults)

| Antes | Depois |
|---|---|
| Eyebrow + description + header alto | Título + actions numa faixa |
| Details + painel visual generoso | Summary fino; fetch igual |
| Chips com padding generoso | Chips densos; mesmos 7 / testids |
| Stack longo até KEEP 1 | Lista sobe na 1ª viewport |
| Prospect / focus / URL | Intactos nos defaults |

---

## 16. Invariantes funcionais

1. Filtros / API / URL / sort / sticky / S6-11.  
2. testids `inbox-shell`, `inbox-filter-*`, `inbox-line-filter`.  
3. Focus opt-in e efeitos em KEEP 3–5.  
4. APIs metrics/team/queue/next + Assumir próxima.  
5. Prospect gating sem mudança silenciosa.  
6. KEEP 1–5 sem redesign.  
7. Sem lazy métricas sem S6-1-B.  
8. Sem focus default sem S6-2-B.

---

## 17. Teclado e a11y (proposta)

| Item | Proposta |
|---|---|
| Modo foco | `aria-pressed` alinhado ao estado |
| Details métricas | summary nativo; opcional testid `inbox-metrics-details` |
| Chips | manter botões e testids |
| Online badge | polish `aria-label` opcional |
| Sem novos dialogs | — |

---

## 18. Desktop e mobile

- Mesma hierarquia; actions do header podem wrap.  
- Mobile: chrome acima da lista quando sidebar; sem inventar navegação.  
- Chat KEEP inalterado.

---

## 19. Riscos

| Risco | Mitigação |
|---|---|
| Omitir description confunde onboarding | Copy pode viver no empty KEEP / FirstConversationHint (já existem) |
| Densificar chips e quebrar hit target | Manter min touch razoável; não mudar labels |
| Lazy “escorregar” na PR | Checklist S6-1-A; review bloqueia |
| Tocar URL phase | Fora de escopo + teste filtros E2E |
| Mexer prospect | Diff vazio nessa área salvo S6-3 |

---

## 20. Critérios de aceite da futura implementação

1. Diff isolado Fatia 6 (shell + densidade filter chrome CSS + testes).  
2. Gates exactamente como no PROCEED humano.  
3. Contratos §7 auditoria + S6-11 intactos.  
4. KEEP 1–5 sem regressão intencional.  
5. Evidência: desktop/mobile; focus on/off; details aberto/fechado; admin prospect (bar intacta).  
6. Sem lazy métricas / focus default / prospect move sem checkbox.

---

## 21. Plano de evidência

| Evidência | Conteúdo |
|---|---|
| Shot 1 | Default B — lista alta na viewport |
| Shot 2 | Details métricas aberto |
| Shot 3 | Focus on |
| Shot 4 | Toast + pricing compactos |
| Shot 5 | Admin prospect bar inalterada |
| Shot 6 | Mobile sidebar |
| Testes | shell focus/metrics mount; filtros E2E existentes |
| Doc | `inbox-shell-chrome-phase6-*-impl-*.md` |

---

## 22. Escopo seguro de uma única PR futura

**Inclui:** `InboxShell.tsx`, densidade visual em `ConversationsList` filterChrome (CSS only), `InboxMetricsPanel` densidade (não contratos), testes shell, docs experiments.

**Exclui:** handlers filtro/URL/sort/sticky; KEEP 1–5; lazy fetch (salvo S6-1-B); prospect rules (salvo S6-3); ChatWindow redesign; timeline.

---

## 23. Arquivos provavelmente afetados

| Ficheiro | Impacto | Nota |
|---|---|---|
| `InboxShell.tsx` | Médio | Header / details / toasts/pricing densidade |
| `InboxMetricsPanel.tsx` | Baixo–médio | Densidade UI only |
| `ConversationsList.tsx` | Baixo | CSS chips/refinement only |
| `OnlineUsersBadge` / aside label | Baixo | Opcional densidade |
| `__tests__/InboxShell*.test.tsx` | Novo | Focus + metrics presence |
| `docs/experiments/*phase6*` | Docs | — |

**Não tocar (defaults):** `InboxProspectMetricsBar` rules, `inboxFetch` filter building, URL effects, `sortThreadsForSidebar`.

---

## 24. Decisão: PROCEED, ITERATE ou BLOCK

Confirmar **PROCEED** com a combinação (ou emendar):

```text
Direção:  [ ] A conservadora    [x] B lista-primeiro (recomendado)

S6-1:  [x] A keep fetch     [ ] B lazy (só se explícito)
S6-2:  [x] A focus opt-in   [ ] B default on
S6-3:  [x] A não mover prospect
S6-4:  [x] A residual+CSS   [ ] B chrome estrutural Fatia 6
S6-5:  [x] A densificar Conversas/online
S6-6:  [x] A toasts compactos   [ ] B adiar/colapsar
S6-7:  [x] A pricing densificado [ ] B sob demanda
S6-8:  [x] A Ajustes mantido
S6-9:  [x] A Assumir no painel
S6-10: [x] A chips CSS only [ ] B reagrupar UI
S6-11: fora
```

| Decisão | Significado |
|---|---|
| **PROCEED** | Aceitar proposta (+ gates); autoriza **implementação isolada** Fatia 6 |
| **ITERATE** | Emendar wireframes / defaults |
| **BLOCK** | Não implementar |

---

## Apêndice A — Respostas ao job canônico

1. **Eixo:** chips + lista KEEP 1.  
2. **Chrome:** header fino; métricas sob summary; pricing/toasts compactos.  
3. **Não faz:** lazy sem aceite; focus default; mexer URL/prospect rules; tocar KEEP 1–5.  
4. **Evidência:** shots + testes shell + E2E filtros.

---

## Apêndice B — Confirmação de isolamento

- Diff de produto: **nenhum** nesta etapa  
- Artefactos: auditoria + esta proposta  
- Commit / push / PR: **não**  
- Implementação: **bloqueada** até PROCEED desta proposta  

---

## Apêndice C — Referências

- Auditoria: `inbox-shell-chrome-phase6-audit-2026-07-29.md`  
- Definição: `inbox-slices-5-6-canonical-definition-2026-07-29.md` §5  
- `main`: `174adf89`
