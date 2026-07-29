# Proposta visual — Fatia 5 · Banner de ação e registro de resultado

Data: **2026-07-29**  
Base: [Auditoria Fatia 5](./inbox-banner-dealclose-phase5-audit-2026-07-29.md) (`PROCEED_TO_VISUAL_PROPOSAL`)  
Pré-condição: `main` @ `9a1cdc51` · Fatias 1–4 KEEP · Definição canônica 5–6 aceite  
Escopo: **proposta documental + wireframes** — sem código, commit, push ou PR  

Skills (coordenadas, advisory): `product-grill`, `frontend-design`, `revenue-centric-design`, `nextjs-ui-polish`, `whatsapp-platform-safe-change`, `devflow-product-evidence`, `test-hardening` (contratos).

Legenda: **FACT** · **HYP** · `BLOCKED_BY_PRODUCT_DECISION`

---

## 1. Resumo executivo

Após KEEP 1–4, a coluna ainda intercalam **urgência (banner)** e **resultado comercial (DealClose)** entre a leitura e o composer densificado. O job canônico da Fatia 5 é: *ler a última mensagem e responder* sem uma segunda pilha administrativa permanente.

**Princípio:** banner e DealClose são **apoio por estado**, não painéis rivais da leitura — capacidades e roles **preservados**; P1/P5/P6 **não** “resolvidos” por estética.

**Direção recomendada:** Alternativa **B — Urgência e resultado progressivos**  
- Banner: faixa compacta; redundância `customer_waiting` reduzida (**gate P5-B**).  
- DealClose: formulários abertos só sob `<details>` (já FACT); densificar rail; **manter** won/lost e pending manager sempre legíveis; **não** mudar o momento de montagem sem **gate P1** explícito (default = **P1-A** keep always-mounted).  
- Alternativa A = fallback de diff mínimo (só densidade).

**Decisão desta proposta:** `PROCEED` (gate humano antes de código) — ver §32 para checkboxes P1/P5.

---

## 2. Pré-condições e evidências

| Item | Estado |
|---|---|
| Auditoria Fatia 5 | Lida na íntegra |
| Definição canônica 5–6 | PROCEED humano |
| KEEP 1–4 | #163–#166 @ `9a1cdc51` |
| Código (FACT auditoria) | Banner 3 variantes; DealClose roles; focus+scroll “Responder agora” |
| E2E desalinhado | `inbox-mobile-revenue.spec.ts` ainda procura **"Fechar venda"** |
| Working tree esperado | docs experiments (definição + auditoria + este ficheiro); **zero** diff produto |

---

## 3. Diagnóstico confirmado

**FACT** (auditoria):

- Ordem: header → banner? → lista → DealClose → (contexto) → composer.  
- Banner: `high_wait` | `negotiation_stalled` | `customer_waiting`; dismiss local + pós-send; CLOSED = off.  
- DealClose: sempre montado `placement="composer"`; details no fluxo aberto; pending manager e won/lost expandidos.  
- Overlap: “precisa resposta” em lista + header + banner; Encerrar ≠ deal.  
- P1/P5/P6 abertos; P6 fora sem aceite.  
- Sem teste UI DealClose; E2E copy desatualizado.

**Não é o problema:** ausência de suggest/close/clear, Assumir, Encerrar ou composer — todos existem e têm KEEP/contratos.

---

## 4. Objetivos e princípios

1. **Leitura → composer** como eixo; chrome Fatia 5 não disputa altura permanente.  
2. **Progressive disclosure** — formulário deal aberto sob demanda; estados críticos (pending, won/lost) visíveis.  
3. **Sem remoção de capacidade** — só hierarquia / densidade / revelação.  
4. **Roles intactas** — operator sugere; manager fecha/confirma/ignora.  
5. **P1 / P5 / P6 / D5-R*** explícitos no gate.  
6. Tokens `df-*`, testids críticos, `#inbox-deal-close`, teclado.  
7. Não tocar KEEP 1–4, timeline, nem Fatia 6.

---

## 5. Anatomia atual (coluna)

```text
ChatHeader (KEEP 2)
ConversationActionBanner?     ← py-3; emoji + copy + Responder/Ocultar
MessageList                   ← FORA
DealClosePanel                ← details OU painel expandido
[Contexto do cliente?]        ← KEEP 4
MessageInput (KEEP 3)
```

---

## 6. Hierarquia visual pretendida

| Prioridade | Superfície |
|---|---|
| 1 | Últimas mensagens (leitura — não redesenhar) |
| 2 | Textarea + Enviar (KEEP 3) |
| 3 | Banner (STATE) — compacto quando on |
| 4 | Deal pending / won / lost (STATE — legível) |
| 5 | Deal formulário aberto (REVEAL — summary) |
| 6 | Follow-up composer (KEEP 3 — não redesenhar) |

---

## 7. Matriz de classificação (proposta)

| Elemento | Classe alvo | Nota |
|---|---|---|
| Banner `high_wait` | STATE_DEPENDENT | Sempre elegível se lógica actual |
| Banner `negotiation_stalled` | STATE_DEPENDENT | Manter (D5-R2 default = keep) |
| Banner `customer_waiting` | STATE **ou** SUPPRESS | **Gate P5** |
| Responder agora / Ocultar | ACTION | Focus+scroll mantidos |
| Deal won / lost | STATE always-visible | Compactar tipografia; não esconder |
| Deal manager pending | STATE always-visible | Não meter em details |
| Deal operator/manager aberto | REVEAL (`details`) | Densificar summary/padding |
| DealClose montagem na coluna | ALWAYS **ou** AFTER_SEND | **Gate P1** — default A = ALWAYS |
| Pós-envio abrir deal | BLOCKED P6 | Sem aceite = não implementar |
| Deal forms se `CLOSED` | OPTIONAL hide | **Gate D5-R1** |

---

## 8. Alternativa A — Conservadora

### Ideia

Diff mínimo: **só densidade visual**. Sem mudar quando banner/deal montam; sem alterar variantes do banner; sem mover âncora.

### Mudanças propostas

1. Banner: reduzir `py-3` → faixa ~`py-1.5` / tipografia `text-xs`–`text-sm`; CTAs mais curtos; emoji com `aria-hidden`.  
2. DealClose aberto (`details`): summary uma linha (~`py-1.5`, `text-[11px]`); conteúdo interno mais apertado; copy intacta (“Fechou venda”, etc.).  
3. Won/lost / pending: menos padding; badges menores; CTAs Confirmar/Ignorar intactos.  
4. E2E: alinhar selector a “Fechou venda” / summary actual (evidência, não produto).  
5. Teste componente DealClose (ramos principais) — hardening.

### Avaliação

| Critério | Nota |
|---|---|
| Competição com leitura | ↓ ligeira |
| P1 / P5 | Intocados |
| Roles / HTTP | Intactos |
| Diff / risco | Baixos |
| Job canônico | Parcialmente atendido |

---

## 9. Wireframes — Alternativa A

### A1 — awaiting_agent (não HIGH)

```text
┌ Header (KEEP) ─────────────────────────────────────┐
│ 👤 Cliente aguardando resposta                     │
│            [Responder agora] [Ocultar]  ← mais baixo│
├ Mensagens ─────────────────────────────────────────┤
├ ▸ Registrar resultado (ganho ou perda) ────────────┤  ← summary fino
├ Composer KEEP ─────────────────────────────────────┤
└────────────────────────────────────────────────────┘
```

### A2 — Manager pending (inalterado em revelação)

```text
├ [Sugestão pendente] [Aguardando confirmação] ──────┤
│ Operador sugeriu · Ganho · Valor …                 │
│ [Confirmar] [Ignorar]                              │
├ Composer KEEP ─────────────────────────────────────┤
```

---

## 10. Alternativa B — Urgência e resultado progressivos (recomendada)

### Ideia

Reduzir **redundância de urgência** e **peso visual** do rail comercial, preservando estados críticos expandidos e todos os handlers. Momento DealClose (P1) e suppress do `customer_waiting` (P5) são **checkboxes de gate** — implementação default sem checkbox = comportamento de montagem actual + densidade B.

### Composição recomendada

```text
ChatHeader (KEEP 2)          ← continua a mostrar “Precisa resposta” / Assumir
[Banner compacto?]           ← ver §11 P5
MessageList
[DealClose rail]
  · won/lost → status 1–2 linhas
  · pending manager → confirm rail (sempre)
  · aberto → <details> summary “Registrar resultado…”
[Contexto?] KEEP 4
MessageInput KEEP 3
```

### Mudanças propostas (B)

**Banner**

1. Faixa compacta (como A) + `aria-hidden` em emoji.  
2. **Gate P5-B (recomendado no PROCEED):** não montar variante `customer_waiting` quando o header já comunica `awaiting_agent` / needs-reply — **manter** `high_wait` e `negotiation_stalled`.  
3. Sem P5-B: densificar só (igual A).  
4. CTAs Responder agora / Ocultar + focus/scroll + dismiss pós-send: **inalterados**.  
5. Não remover banner por completo (P5-C) nesta fatia.

**DealClose**

6. Densidade A aplicada.  
7. Summary operator: “Registrar resultado — sugestão ao gestor”; manager: “Registrar resultado (ganho ou perda)”.  
8. Pending / won / lost: sempre fora de details; tipografia compacta.  
9. **Gate P1 default = A (ALWAYS montado)** — igual FACT.  
10. **Gate P1-B (opcional):** AFTER_SEND_SESSION — montar formulário/details de deal *aberto* só após primeiro envio humano na sessão da thread (ou dismiss banner pós-send); **won/lost e pending manager continuam sempre**. Sem checkbox = não implementar.  
11. **Gate D5-R1 (recomendado):** se `thread.status === "CLOSED"` e deal ainda aberto, ocultar formulários suggest/close; manter won/lost se já fechados.  
12. D5-R2/R3: manter `negotiation_stalled`; manager sem UI de “só sugerir”.

**Testes / E2E**

13. Componente DealClose + ajuste E2E copy/selectors.  
14. Se P5-B: testes de lógica banner (customer_waiting omitido quando aplicável).

### Avaliação

| Critério | Nota |
|---|---|
| Competição com leitura | ↓ material se P5-B; ↓ moderada só com densidade |
| Clareza HIGH / pending | Mantida ou melhor (HIGH banner sobrevive) |
| P1 flip | Só com checkbox AFTER_SEND |
| Roles / HTTP | Intactos |
| Diff | Médio (UI + lógica banner opcional + testes) |
| Job canônico | Melhor alinhamento |

---

## 11. Gates P1 / P5 / P6 / D5-R* (opções A/B)

### P1 — Momento do DealClose

| Opção | Comportamento | Risco | Default se PROCEED sem nota |
|---|---|---|---|
| **P1-A** Always-mounted | Como hoje; só densificar | Baixo | **Sim** |
| **P1-B** After-send (sessão) | Forms abertos só pós primeiro send humano na thread; pending/won/lost sempre | Médio (disciplina comercial) | Não |
| **P1-C** Remover da coluna / só CRM | Fora de escopo KEEP 4 | Alto | **BLOCK** |

### P5 — Banner vs redundância

| Opção | Comportamento | Risco | Default recomendado |
|---|---|---|---|
| **P5-A** Densificar só | Copy `customer_waiting` permanece | Baixo | Fallback |
| **P5-B** Suppress `customer_waiting` | Header+lista cobrem “precisa resposta”; banner só HIGH / stall | Médio-baixo (menos CTA Responder) | **Recomendado** |
| **P5-C** Remover banner | Perde HIGH minutos + atalho foco | Alto | **BLOCK** nesta fatia |

### P6 — Pós-envio

| Opção | Default |
|---|---|
| Não implementar | **Obrigatório** sem aceite explícito separado |

### D5-R1 — Deal em CLOSED

| Opção | Default recomendado |
|---|---|
| **R1-A** Manter forms (FACT) | Fallback |
| **R1-B** Ocultar forms se CLOSED e deal aberto | **Recomendado** com B |

### D5-R2 / R3

Manter stalled; manter UI manager≠suggest — **sem flip**.

---

## 12. Wireframes — Alternativa B

### B1 — awaiting_agent, não HIGH, **com P5-B**

```text
┌ Header · Precisa resposta · [Assumir] [Encerrar] ──┐
├ (sem banner customer_waiting) ─────────────────────┤
├ Mensagens ─────────────────────────────────────────┤
├ ▸ Registrar resultado … ───────────────────────────┤
├ Composer ──────────────────────────────────────────┤
└────────────────────────────────────────────────────┘
```

### B2 — HIGH + awaiting_agent (banner permanece)

```text
┌ Header … ──────────────────────────────────────────┐
│ 🔥 Lead HIGH aguardando resposta há 12 min         │
│            [Responder agora] [Ocultar]             │
├ Mensagens ─────────────────────────────────────────┤
├ ▸ Registrar resultado … ───────────────────────────┤
├ Composer ──────────────────────────────────────────┤
```

### B3 — negotiation_stalled

```text
│ ⏳ Negociação parada há 45 min  [Responder agora]  │
```

### B4 — Operator aberto (details fechado)

```text
├ ▸ Registrar resultado — sugestão ao gestor ────────┤
├ [textarea KEEP] [Enviar] ──────────────────────────┤
```

### B5 — Manager pending (sempre expandido, compacto)

```text
├ Sugestão pendente · Aguardando confirmação ────────┤
│ Operador sugeriu · Ganho · R$ 1.500                │
│ [Confirmar] [Ignorar]                              │
├ Composer ──────────────────────────────────────────┤
```

### B6 — Won / Lost

```text
├ Venda fechada · R$ 1.500 ──────────────────────────┤
```

```text
├ Oportunidade perdida · Motivo: Preço ──────────────┤
```

### B7 — P1-B (só se gate) — deal aberto antes do primeiro send

```text
├ Mensagens ─────────────────────────────────────────┤
├ (DealClose forms omitidos; pending/won/lost se houver)
├ Composer ──────────────────────────────────────────┤
   … após Enviar OK …
├ ▸ Registrar resultado … ───────────────────────────┤
├ Composer ──────────────────────────────────────────┤
```

### B8 — CLOSED + deal aberto com R1-B

```text
┌ Header · Reabrir … ────────────────────────────────┐
├ (sem banner) ──────────────────────────────────────┤
├ Mensagens ─────────────────────────────────────────┤
├ (sem formulário deal) ─────────────────────────────┤
├ Composer ──────────────────────────────────────────┤
```

---

## 13. Comparação A vs B

| Critério | A Conservadora | B Progressiva |
|---|---|---|
| Densidade | ↑ | ↑↑ |
| Redundância “precisa resposta” | Igual | ↓ com P5-B |
| HIGH wait | Igual | Preservado |
| Pending / won/lost | Densos | Densos + sempre on |
| P1 flip | Não | Opcional checkbox |
| Risco | Baixo | Médio se P1-B; baixo sem |
| Alinhamento job canônico | Fraco–médio | **Forte** com P5-B |

---

## 14. Direção recomendada

**Implementar Alternativa B** com defaults de gate:

| Gate | Valor recomendado no PROCEED |
|---|---|
| Direção UI | **B** |
| **P5** | **B** (suppress `customer_waiting`) |
| **P1** | **A** (always-mounted + densificar) |
| **P6** | Não |
| **D5-R1** | **B** (ocultar forms se CLOSED) |
| **D5-R2 / R3** | Keep |

Se o humano preferir risco mínimo: **PROCEED com Alternativa A** (P5-A, P1-A, R1-A).

Se quiser disciplina “resultado depois da resposta”: marcar **P1-B** explicitamente no PROCEED.

---

## 15. Before / after esperado (B + P5-B + P1-A + R1-B)

| Antes | Depois |
|---|---|
| Banner `customer_waiting` + header “precisa resposta” | Só header (+ lista); banner para HIGH/stall |
| Banner alto (`py-3`) | Faixa compacta |
| Deal details + padding generoso | Summary fino; forms intactos |
| Pending/won/lost generosos | Compactos, sempre visíveis |
| Deal forms em CLOSED | Ocultos se deal ainda aberto |
| E2E “Fechar venda” | Selectors alinhados ao DOM |

---

## 16. Invariantes funcionais

1. Lógica HIGH / stall ≥30m / needs-reply (salvo suppress P5-B só em `customer_waiting`).  
2. Dismiss local + reset `threadId` + pós-send.  
3. Focus `#inbox-composer` + scroll `#inbox-composer-anchor`.  
4. Roles operator/manager; APIs suggest/close/clear; motivos lost.  
5. `id="inbox-deal-close"`; `conversation-action-banner`; `banner-respond-now`.  
6. Encerrar ≠ deal.  
7. Não redesenhar KEEP 1–4 / MessageList / shell Fatia 6.  
8. Sem P6.  
9. Pending manager e won/lost **nunca** só dentro de details escondidos sem sinal.

---

## 17. Teclado, foco e a11y

| Item | Proposta |
|---|---|
| Responder agora | Manter focus + scroll |
| Banner | `role="status"`; emoji `aria-hidden` |
| Details deal | Nativos; summary focável |
| Erros | `role="alert"` mantido |
| Pending | Sem dialog novo; botões na tab order |
| Live region pending | Opcional polish — não bloqueante |

---

## 18. Desktop e mobile

- Mesma anatomia; gutters `INBOX_CHAT_GUTTER_X`.  
- Mobile: summary deal fino reduz roubo acima do KEEP 3 (já sem grelha 4 CTAs).  
- Não inventar CTA “Fechar venda” na quick bar.

---

## 19. Riscos

| Risco | Mitigação |
|---|---|
| P5-B esconde atalho Responder em waiting comum | Header+lista; HIGH ainda tem banner; Ocultar/focus inalterados quando banner on |
| P1-B atrasa registo comercial | Só com aceite; pending/won/lost sempre |
| R1-B esconde deal em CLOSED | Reabrir conversa no header; won/lost permanecem |
| E2E quebrado | Fix selectors no mesmo PR |
| Regressão roles | Testes serviço intactos + novo teste UI |

---

## 20. Critérios de aceite da futura implementação

1. Diff isolado Fatia 5 (banner + DealClose + ChatWindow wiring mínimo + testes).  
2. Caps/roles/HTTP preservados.  
3. Gates aplicados exactamente como no PROCEED humano.  
4. Evidência: screenshots desktop + mobile; testes unit/UI; E2E revenue alinhado ou justificado.  
5. KEEP 1–4 sem regressão visual intencional.  
6. Sem P6 / sem Fatia 6 / sem timeline.

---

## 21. Plano de evidência

| Evidência | Conteúdo |
|---|---|
| Shot 1 | awaiting_agent não HIGH — com/sem banner conforme P5 |
| Shot 2 | HIGH wait compacto + Responder agora |
| Shot 3 | Deal details fechado + composer |
| Shot 4 | Manager pending compacto |
| Shot 5 | Won e Lost |
| Shot 6 | Mobile 390 — pilha lista→deal→composer |
| Testes | banner logic (+ P5-B se on); DealClose UI; E2E selectors |
| Doc | `inbox-banner-dealclose-phase5-*-impl-*.md` + evidence |

---

## 22. Escopo seguro de uma única PR futura

**Inclui:** `ConversationActionBanner.tsx`, `conversationActionBannerLogic.ts` (se P5-B), `DealClosePanel.tsx`, wiring mínimo `ChatWindow.tsx` (se P1-B/R1), testes + E2E fix + docs experiments.

**Exclui:** MessageInput/Playbook, ChatHeader, LeadDataPanel, ConversationItem, InboxShell, MessageList, APIs deal, P6, Fatia 6.

---

## 23. Arquivos provavelmente afetados

| Ficheiro | Impacto | Nota |
|---|---|---|
| `ConversationActionBanner.tsx` | Médio | Densidade + a11y emoji |
| `conversationActionBannerLogic.ts` | Baixo–médio | Só se P5-B |
| `DealClosePanel.tsx` | Médio | Densidade; R1-B se aceite |
| `ChatWindow.tsx` | Baixo | Só se P1-B |
| `__tests__/conversationActionBannerLogic.test.ts` | Médio | P5-B |
| `__tests__/*DealClose*` (novo) | Alto (cobertura) | Ramos UI |
| `tests/e2e/inbox-mobile-revenue.spec.ts` | Médio | Selectors |
| `docs/experiments/*phase5*` | Docs | Audit/proposal/impl/evidence |

---

## 24. Decisão: PROCEED, ITERATE ou BLOCK

### Pedido ao humano

Confirmar **PROCEED** com a combinação de gates (ou emendar):

```text
Direção:     [ ] A conservadora    [x] B progressiva (recomendado)
P5:          [ ] A densificar      [x] B suppress customer_waiting    [ ] C remover banner (BLOCK)
P1:          [x] A always+densify  [ ] B after-send session           [ ] C fora coluna (BLOCK)
P6:          [x] Não
D5-R1:       [ ] A keep forms CLOSED   [x] B hide forms se CLOSED+deal aberto
D5-R2/R3:    [x] Keep
```

| Decisão | Significado |
|---|---|
| **PROCEED** | Aceitar proposta (+ gates); autoriza **implementação isolada** Fatia 5 |
| **ITERATE** | Emendar wireframes / defaults de gate |
| **BLOCK** | Não implementar |

**Alternativa A** como único caminho também é `PROCEED` válido (risco mínimo).

---

## Apêndice A — Respostas ao job canônico

1. **Eixo:** mensagens → composer; banner/deal como STATE/REVEAL.  
2. **Banner:** compacto; P5-B corta triplicação “à espera”.  
3. **Deal:** pending/won/lost legíveis; forms em details; P1-A por defeito.  
4. **Não faz:** P6, mexer KEEP, fundir Encerrar+deal.  
5. **Evidência:** shots + testes + E2E alinhado.

---

## Apêndice B — Confirmação de isolamento

- Diff de produto: **nenhum** nesta etapa  
- Artefactos: auditoria + esta proposta (+ definição canônica already untracked)  
- Commit / push / PR: **não**  
- Implementação: **bloqueada** até PROCEED desta proposta  

---

## Apêndice C — Referências

- Auditoria: `inbox-banner-dealclose-phase5-audit-2026-07-29.md`  
- Definição: `inbox-slices-5-6-canonical-definition-2026-07-29.md`  
- Fatia 3 (P1 provisório): `inbox-composer-assistances-phase3-visual-proposal-2026-07-28.md` §17, §26  
- `main`: `9a1cdc51`
