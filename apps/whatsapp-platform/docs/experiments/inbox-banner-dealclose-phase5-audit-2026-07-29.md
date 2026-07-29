# Auditoria — Fatia 5 · Banner de ação e registro de resultado

Data: **2026-07-29**  
Branch base: `main` @ `9a1cdc51` (merge [#166](https://github.com/devflow-modules/devflow/pull/166) — Fatia 4 KEEP)  
Escopo: **auditoria documental apenas** — nenhum componente, estilo, handler ou teste alterado  

Pré-condições:

| Check | Resultado |
|---|---|
| Fatia 1 lista | KEEP (#163) |
| Fatia 2 header | KEEP (#164) |
| Fatia 3 composer | KEEP (#165) |
| Fatia 4 contexto | KEEP (#166) @ `9a1cdc51` |
| Definição canônica Fatias 5–6 | **PROCEED** humano (`inbox-slices-5-6-canonical-definition-2026-07-29.md`) |
| `main` local | `9a1cdc51` |

Skills (coordenadas, advisory): `product-grill`, `frontend-design`, `revenue-centric-design`, `nextjs-ui-polish`, `whatsapp-platform-safe-change`, `devflow-product-evidence`, `test-hardening` (mapa de cobertura).

Legenda: **FACT** · **HYP** · **UNKNOWN** / `BLOCKED_BY_PRODUCT_DECISION`

---

## 1. Resumo executivo

Na coluna da conversa, depois do header densificado (KEEP 2) e **antes** do composer densificado (KEEP 3), o operador encontra duas superfícies administrativas:

1. **`ConversationActionBanner`** — urgência “responder agora” (condicional; dismiss local; focus+scroll para o composer).  
2. **`DealClosePanel`** — registro comercial won/lost / sugestão / confirmação (`placement="composer"`, entre `MessageList` e `MessageInput`).

**Problema operacional (FACT + HYP):** o job canônico da Fatia 5 é *ler a última mensagem e responder* sem uma segunda pilha entre histórico e editor. Hoje o banner (quando activo) e o DealClose (quase sempre montado — summary ou painel expandido) **ainda intercalam** a leitura e a composição, mesmo após densificação KEEP 3 dos details/mutex do composer.

**Job do operador nestas superfícies:**

1. perceber urgência de resposta humana (banner) e ir ao composer;  
2. registar ou confirmar resultado comercial (deal) com roles correctas;  
3. **não** assumir ownership (header), **não** Encerrar conversa (header), **não** editar CRM/prospect (KEEP 4).

**Decisão desta auditoria:** `PROCEED_TO_VISUAL_PROPOSAL` — inventário e contratos fechados; **P1 / P5 / P6** e roles deal devem entrar na proposta como opções A/B ou bloqueios explícitos, não como “resolvidos” por estética.

---

## 2. Escopo e fontes examinadas

### Em escopo (definição canônica §4)

- `ConversationActionBanner` + `conversationActionBannerLogic`.  
- `DealClosePanel` (`placement="composer"` e estados won/lost/sugestão/confirmação).  
- Relação visual com header KEEP 2 e composer KEEP 3 (**sem redesenhar** esses KEEP).  
- Decisões abertas a **endereçar no gate**: sobretudo **P1** (momento DealClose), **P5** (banner vs redundância), roles deal já existentes.

### Fora de escopo

- `MessageInput` / templates / IA / Playbook (KEEP 3).  
- `ChatHeader` / Mais / notas / histórico (KEEP 2).  
- `LeadDataPanel` / Prospect (KEEP 4).  
- `ConversationItem` / filtros da lista (KEEP 1).  
- `InboxShell` métricas/título (→ Fatia 6).  
- `MessageList` / bolhas (adiado).  
- Novas automações pós-envio (**P6**) sem aceite explícito.

### Fontes (FACT)

| Fonte | Path |
|---|---|
| Definição | `docs/experiments/inbox-slices-5-6-canonical-definition-2026-07-29.md` |
| Banner UI | `src/components/inbox/ConversationActionBanner.tsx` |
| Banner lógica | `src/components/inbox/conversationActionBannerLogic.ts` |
| Deal UI | `src/components/inbox/DealClosePanel.tsx` |
| Montagem | `src/components/inbox/ChatWindow.tsx` |
| Needs-reply helper | `src/components/inbox/messageOutboundKind.ts` |
| Follow-up (overlap KEEP 3) | `src/components/inbox/followUpUtils.ts`, `MessageInput.tsx` |
| Client HTTP | `src/components/inbox/inboxFetch.ts` |
| Routes | `app/api/inbox/conversations/[id]/{close-deal,suggest-deal,clear-deal-suggestion}/` (+ aliases `/api/conversations/...`) |
| Services | `modules/inbox/threadDealService.ts`, `suggestDealService.ts`, `*Http.ts`, `dealTypes.ts` |
| Roles | `lib/roles.ts`, `modules/auth/verifyToken.ts` |
| Overlap KEEP | `ChatHeader.tsx`, `ConversationItem.tsx`, `conversationStateUi.tsx`, `LeadDataPanel.tsx` |
| Auditorias prévias | Fatia 3 (`inbox-composer-assistances-phase3-audit-2026-07-28.md` §16, §21 P1/P5/P6); Fatia 4 (deal fora do painel) |
| Testes | `conversationActionBannerLogic.test.ts`, `guidedInboxComponents.test.tsx`, `suggestDealService.test.ts`, `threadDealService.test.ts`, `tests/e2e/inbox-mobile-revenue.spec.ts` |

---

## 3. Fluxo atual: urgência → leitura → resultado → composição

```text
Selecionar conversa
  → ChatHeader (KEEP 2: estado, Assumir, Encerrar, Mais)
  → [ConversationActionBanner?]   ← Fatia 5
        · high_wait | negotiation_stalled | customer_waiting
        · Responder agora → focus #inbox-composer + scroll #inbox-composer-anchor
        · Ocultar → dismiss local (reset na troca de thread)
  → MessageList                   ← FORA (adiado)
  → DealClosePanel placement=composer   ← Fatia 5
        · won/lost status sempre expandido
        · operator: <details> sugerir
        · manager pending: painel confirm/ignorar expandido
        · manager aberto: <details> fechar ganho/perda
  → [barra “Contexto do cliente”?]  ← KEEP 4 (md–lg / focus)
  → MessageInput (KEEP 3)
        · onSuccess: limpa texto + dismiss banner + markFirstReplySent
        · follow-up banner (awaiting_customer ≥4h) — estado oposto ao action banner
```

**FACT — ordem vertical na coluna (ChatWindow):** banner → lista → DealClose → (contexto trigger) → composer.

---

## 4. Inventário de componentes

| Componente | Papel | Montagem |
|---|---|---|
| `ConversationActionBanner` | Urgência + CTAs Responder/Ocultar | Topo do pane de thread (abaixo do header) |
| `computeConversationActionBanner` / `bannerLabel` | Variante pura, sem rede | Consumido pelo banner |
| `DealClosePanel` | Resultado comercial por role | Entre lista e MessageInput; só `placement="composer"` em produto |
| `ChatWindow` | Estado `actionBannerDismissed`; wiring focus/dismiss | Orquestra Fatia 5 |

Prop `placement="thread"` em DealClose: **existe no tipo**, **não há call site** no app (só altera padding).

---

## 5. Inventário de handlers, permissões e contratos

### Banner — FACT

| Capacidade | Mutação HTTP | Gate |
|---|---|---|
| Mostrar / esconder variante | Nenhuma | Lógica local + `dismissed` |
| Responder agora | Nenhuma | Focus + scroll DOM |
| Ocultar | Nenhuma | `setActionBannerDismissed(true)` |
| Pós-send dismiss | Nenhuma | `onAgentMessageSent` → dismiss |

### Deal — FACT

| Ação | Client | Auth API | Quem na UI |
|---|---|---|---|
| Close won/lost | `postCloseInboxDeal` | `ROLES_MANAGER_PLUS` | Manager / platform_admin |
| Suggest won/lost | `postSuggestInboxDeal` | `ROLES_OPERATIONAL` | Operator (UI); API também permite manager — **UI manager não usa ramo suggest** |
| Clear suggestion | `postClearDealSuggestion` | `ROLES_MANAGER_PLUS` | Manager “Ignorar” |

Invalidação pós-mutação: `INBOX_QK.thread` + `["inbox-conversations"]`.

Motivos lost canónicos: `dealTypes.ts` (`preco`, `sem_interesse`, `sem_resposta`, `concorrente`, `outro`).

**FACT — Encerrar ≠ deal:** header `Encerrar` muda `thread.status` → `CLOSED`; DealClose muda `dealStatus` won/lost. Banner some em `CLOSED`; DealClose **não** esconde por `CLOSED`.

**UNKNOWN:** intenção de produto para formulário deal em conversa já `CLOSED`.

---

## 6. ConversationActionBanner — anatomia e regras

### Variantes (prioridade) — FACT

Ordem em `computeConversationActionBanner`:

1. **`high_wait`** — `priority === "HIGH"` e (`awaiting_agent` **ou** `threadNeedsAgentReply`) → minutos desde `lastUnansweredInboundAt ?? lastCustomerMessageAt ?? lastMessageAt` (mín. 1).  
2. **`negotiation_stalled`** — `aiState` ≈ `"negotiating"`, silêncio ≥30 min em `lastMessageAt`, e estado **≠** `awaiting_agent`.  
3. **`customer_waiting`** — `awaiting_agent` **ou** needsHuman.  
4. senão `null`.

Gates de ausência: `thread == null`, `status === "CLOSED"`, `dismissed === true`.

Copy UI (com prefixo emoji 🔥 / ⏳ / 👤):

- HIGH: `Lead HIGH aguardando resposta há {n} min`  
- stalled: `Negociação parada há {n} min`  
- waiting: `Cliente aguardando resposta`

### Persistência dismiss — FACT

- Local React em `ChatWindow`.  
- Reset ao mudar `threadId`.  
- Também dismiss após envio humano OK.  
- **Não** persiste em storage/servidor.

### testids — FACT

- `data-testid="conversation-action-banner"`  
- `data-testid="banner-respond-now"`

### a11y — FACT / gaps

- Container `role="status"`.  
- CTAs `type="button"`.  
- Emojis no texto sem `aria-hidden` (copy já verbaliza).  
- Sem `aria-live` além de `status`.

---

## 7. DealClosePanel — anatomia por role e estado

| Estado | Expansão | Copy / CTAs principais |
|---|---|---|
| `dealStatus === "won"` | Sempre | “Venda fechada” + valor BRL |
| `dealStatus === "lost"` | Sempre | “Oportunidade perdida” + motivo |
| Operator, deal aberto | `<details>` | Summary “Registrar resultado — sugestão ao gestor”; Sugerir ganho/perda |
| Operator + pending | Badge + details (CTAs suggest disabled) | “Sugestão pendente” |
| Manager + pending | **Sempre expandido** | Confirmar / Ignorar; valor pré-preenchido se won |
| Manager, sem pending | `<details>` | “Registrar resultado (ganho ou perda)”; **Fechou venda** / **Perdeu venda** |
| Role sem operator nem manager | `null` | — |

Âncora DOM: `id="inbox-deal-close"` em todos os ramos visíveis.

**FACT — densificação Fatia 3:** fluxos padrão operator/manager aberto já usam `<details>`; pending manager e won/lost **não** — continuam “painéis permanentes” na coluna.

---

## 8. Cobertura atual de testes

| Área | Cobertura | Gap |
|---|---|---|
| Lógica banner (3 variantes) | `conversationActionBannerLogic.test.ts` | Poucos edge: CLOSED, null, needsHuman sem state, HIGH só via timestamps |
| UI banner HIGH | `guidedInboxComponents.test.tsx` | Dismiss / focus / pós-send não cobertos em integração |
| Suggest/clear service | `suggestDealService.test.ts` | — |
| Close service | `threadDealService.test.ts` | — |
| **DealClosePanel UI** | **Ausente** | Operator/manager/won/lost/pending sem teste de componente |
| E2E deal | `inbox-mobile-revenue.spec.ts` | Espera texto/botão **"Fechar venda"** — **string inexistente** no `src/` actual (“Fechou venda” / “Registrar resultado…”); âncora `#inbox-deal-close` ainda referida |
| E2E suggest→confirm | Ausente | Fluxo por role não coberto |

**HYP:** qualquer mudança visual Fatia 5 no DealClose deve **alinhar ou isolar** o E2E `inbox-mobile-revenue` no mesmo PR, senão risco de falso negativo/positivo.

---

## 9. Ordem de atenção e competição com a leitura

**Etapas típicas antes do textarea (FACT):**

1. Header (KEEP)  
2. Banner? (Fatia 5)  
3. Mensagens (adiado)  
4. DealClose summary ou painel expandido (Fatia 5)  
5. Barra Contexto? (KEEP 4)  
6. Composer densificado (KEEP 3)

**HYP alinhada ao job canônico:** banner e DealClose são as únicas camadas administrativas **ainda autorizadas** a mudar na coluna sem tocar KEEP 1–4 / timeline; o sucesso da fatia é reduzir permanência/competição **sem** remover capacidade.

---

## 10. Repetições e overlaps (KEEP 1–4)

| Sinal | Superfícies | Distinção (FACT) |
|---|---|---|
| Cliente à espera / precisa resposta | Lista badge; header badge + copy; banner `customer_waiting` / `high_wait` | Mesmo estado operacional, **3 camadas** de copy |
| Wait / atraso | Lista wait-exceção; header SLA-exceção; banner minutos HIGH | Banner usa **priority CRM HIGH**; lista/header usam SLA/`responseDelayMs` — **métricas diferentes** |
| Assumir | Header + row lista | Banner **não** assume; CTA é “Responder agora” (KEEP 2 já separou rótulos) |
| Encerrar vs resultado | Header Encerrar → `CLOSED`; DealClose → `dealStatus` | Conceitos distintos (não unificar sem decisão) |
| HIGH | Banner copy; CRM glance (KEEP 4); header **sem** chip HIGH | Overlap banner ↔ CRM |
| Deal formulário | Só DealClose | KEEP 4 confirmou deal **fora** do painel |
| Urgência “oposta” | Action banner (`awaiting_agent`…); follow-up composer (`awaiting_customer` ≥4h) | Dois banners de urgência em momentos diferentes |

---

## 11. Matriz de classificação (hierarquia)

| Elemento | Classificação actual | Nota produto |
|---|---|---|
| Banner variantes | **STATE_DEPENDENT** | Também dismissible + pós-send |
| Banner “Responder agora” | **ACTION_PRIMARY** (quando banner on) | Já foca composer (mitigação parcial P5 desde KEEP 3) |
| Deal won/lost status | **STATE_DEPENDENT** sempre expandido | Feedback pós-resultado |
| Deal manager pending | **STATE_DEPENDENT** sempre expandido | Gate de confirmação |
| Deal operator/manager aberto | **ALWAYS_MOUNTED** + **REVEAL_ON_DEMAND** (`details`) | Momento na coluna ainda **ALWAYS** → **P1** |
| Follow-up (KEEP 3) | **STATE_DEPENDENT** | Fora de escopo de redesign; overlap documental |

---

## 12. Matriz de estados (coluna)

| Estado | Banner | DealClose | Header (overlap) | Follow-up composer |
|---|---|---|---|---|
| Unassigned + awaiting_agent | Pode waiting/high_wait | Independente | Assumir | Não |
| awaiting_agent | Sim (se não CLOSED/dismiss) | Independente | “Precisa resposta” | Não |
| awaiting_customer | Só `negotiation_stalled` (tipicamente) | Independente | “Aguardando cliente” | Possível ≥4h |
| HIGH + needs reply | `high_wait` | Independente | Sem chip HIGH | — |
| CLOSED | Oculto | Pode continuar se deal aberto | Reabrir | Tipicamente não |
| deal pending | Independente | Operator details+badge; manager expandido | — | — |
| deal won/lost | Independente | Status expandido | — | — |
| evaluationMode | Sem efeito directo | Sem efeito | — | CRM permanece via shell |

---

## 13. Teclado, foco e acessibilidade

| Superfície | FACT | Gap / UNKNOWN |
|---|---|---|
| Responder agora | Focus `#inbox-composer` + `scrollIntoView` âncora | — |
| Banner | `role="status"` | Sem live region dedicada |
| Deal forms | `htmlFor` / labels; erros `role="alert"` | — |
| `<details>` | Teclado nativo UA | Sem `aria-expanded` custom |
| Manager pending | Botões Confirmar/Ignorar | Sem `role="dialog"`; badge sem anúncio live |
| Emojis banner | No texto | Preferível `aria-hidden` em glyph |

---

## 14. Responsividade

**FACT:** banner e DealClose usam gutters `INBOX_CHAT_GUTTER_X`, flex wrap, CTAs `min-h-11`/`min-h-12` nos formulários. Não há variante mobile dedicada que esconda DealClose.

**HYP:** em viewport baixa, summary DealClose + banner (se on) + follow-up (se on) ainda empilham chrome entre lista e campo — núcleo do job Fatia 5.

---

## 15. Invariantes funcionais (não quebrar na implementação)

1. Variantes e prioridade do banner (HIGH > stall ≥30m > waiting).  
2. Banner oculto em `CLOSED` e após dismiss / pós-send; reset na troca de thread.  
3. “Responder agora” continua a focar o composer (e scroll âncora, salvo decisão de mudar comportamento).  
4. Roles: operator sugere; manager fecha/confirma/ignora; sem role operacional → sem painel.  
5. Contratos HTTP suggest/close/clear e motivos lost.  
6. `id="inbox-deal-close"` e testids de banner preservados ou migrados com evidência.  
7. Encerrar (header) e deal permanecem conceitos distintos.  
8. Não mover deal para KEEP 4 / não redesenhar KEEP 1–3.  
9. Sem novas automações pós-envio (P6) sem aceite.

---

## 16. Riscos da futura simplificação

| Risco | Severidade | Mitigação |
|---|---|---|
| Esconder DealClose e perder disciplina comercial | Alta (produto) | **P1** explícito: ALWAYS / AFTER_SEND / REVEAL |
| Remover banner e perder atalho de foco | Média | **P5**: reduzir copy redundante vs manter CTA |
| Unificar Encerrar + deal | Alta (contrato) | Fora de escopo; manter separado |
| Quebrar E2E “Fechar venda” | Média (CI) | Actualizar selectors no PR Fatia 5 |
| Manager deixa de ver pending expandido | Alta (ops) | Qualquer collapse precisa de sinal forte de pending |
| Alterar métrica HIGH vs SLA sem querer | Média | Não “igualar” banner à lista sem decisão |

---

## 17. Decisões de produto bloqueadas (gate)

| ID | Questão | Estado em `9a1cdc51` | Origem |
|---|---|---|---|
| **P1** | Momento do DealClose na coluna (ALWAYS vs AFTER_SEND vs REVEAL_ON_DEMAND / só summary) | **Aberto** — montado sempre entre lista e composer; details só no fluxo “aberto” | Fatia 3 §21; definição Fatia 5 |
| **P5** | Banner vs redundância lista/header | **Parcialmente mitigado** (focus+scroll KEEP 3); copy/urgência **intactas**; overlap “precisa resposta” permanece | Fatia 3 §21 |
| **P6** | Automações pós-envio (abrir deal, etc.) | **Aberto; canónico Fatia 5 = fora sem aceite** — onSuccess só dismiss banner + limpeza composer | Fatia 3; definição §4 fora de escopo |
| **D5-R1** | Deal UI quando `thread.status === CLOSED` | **UNKNOWN** — painel pode continuar | Esta auditoria |
| **D5-R2** | Manter variante `negotiation_stalled` | **UNKNOWN** — código + 1 teste; pouco sinal de produto recente | Esta auditoria |
| **D5-R3** | Manager deve poder “sugerir” na UI (API já em operational) | **UNKNOWN** — UI salta para close | Esta auditoria |

P2–P4, P7–P8 (rascunho, mobile além smoke, etc.) e C5/C7 permanecem **adiados** (definição §6) — não são gate obrigatório desta fatia.

---

## 18. Hipóteses que exigirão gate humano

1. **HYP:** Após a lista, o próximo âncora visual deve ser o composer; DealClose só sob demanda ou pós-envio (**P1**).  
2. **HYP:** Banner deve reduzir-se a CTA de foco **ou** a um único chip de urgência não duplicado do header (**P5**), sem perder HIGH wait.  
3. **HYP:** Status won/lost e pending manager podem permanecer sempre visíveis; só o formulário “aberto” compete com a leitura.  
4. **HYP:** Alinhar E2E ao copy actual é pré-requisito de evidência, não mudança de produto.

---

## 19. Escopo seguro de uma futura proposta visual

**Pode propor (sem aceitar ainda):**

- Hierarquia/revelação do banner (densidade, copy, quando montar).  
- Momento/revelação do DealClose (opções A/B amarradas a **P1**).  
- Densidade visual de badges pending / won/lost **preservando** CTAs e roles.  
- A11y incremental (emoji, live region, expanded).  
- Plano de teste: componente DealClose + ajuste E2E selectors.

**Não pode “resolver” só na proposta sem gate:**

- Remover capacidade suggest/close/clear.  
- Fundir Encerrar + deal.  
- Implementar P6.  
- Mudar contratos HTTP / motivos lost.  
- Redesign KEEP 1–4 ou timeline.

---

## 20. Critérios para avançar

- [x] Inventário banner + DealClose com paths e regras  
- [x] Handlers/roles/contratos HTTP documentados  
- [x] Overlaps KEEP 1–4 e follow-up nomeados  
- [x] Matriz de estados  
- [x] Gaps de teste (UI DealClose + E2E desalinhado)  
- [x] P1/P5/P6 e D5-R* marcados, não inventados como regra  
- [x] Isolamento: **zero** diff de produto nesta etapa  
- [ ] Aceite humano da **proposta visual** (próximo passo)

---

## 21. Decisão final

### `PROCEED_TO_VISUAL_PROPOSAL`

Auditoria documental da Fatia 5 completa em `main` @ `9a1cdc51`.  
Próximo passo autorizado pelo protocolo: **proposta visual Fatia 5** (opções A/B para P1/P5; roles preservadas; sem código até **PROCEED** da proposta).

Opções de resposta humana a esta auditoria:

| Decisão | Significado |
|---|---|
| **PROCEED** | Aceitar auditoria; autorizar **só** proposta visual Fatia 5 |
| **ITERATE** | Emendar inventário / bloqueios neste doc |
| **BLOCK** | Não avançar para proposta |

---

## Apêndice A — Respostas ao job canônico

1. **Caminho actual:** header → (banner) → mensagens → (deal) → (contexto bar) → composer.  
2. **O que atrasa a resposta:** banner (condicional) + DealClose montado (summary ou expandido) entre lista e editor.  
3. **O que o banner faz bem:** atalho focus+scroll; sinal HIGH com minutos.  
4. **O que o DealClose faz bem:** roles operator/manager; confirmação pendente; status won/lost legível.  
5. **O que compete sem necessidade clara:** copy “cliente à espera” triplicada; DealClose always-mounted vs job “ler e responder” (**P1**).  
6. **Fora desta fatia:** shell métricas (6), bolhas, Mais a11y, rascunho, C5/C7, P6.

---

## Apêndice B — Confirmação de isolamento

- Diff de produto (tsx/css/handlers/tests): **nenhum** nesta etapa  
- Único artefacto: este documento sob `docs/experiments/`  
- Commit / push / PR: **não executados** (aguardam instrução humana)  
- Fatia 6: **não auditada**  
- Implementação Fatia 5: **não autorizada**

---

## Apêndice C — Referências cruzadas

- Definição: `inbox-slices-5-6-canonical-definition-2026-07-29.md` §4  
- Fatia 3 P1/P5/P6: `inbox-composer-assistances-phase3-audit-2026-07-28.md` §21  
- Fatia 3 densificação DealClose: `inbox-composer-assistances-density-impl-2026-07-28.md`  
- Fatia 4 deal ownership: `inbox-context-panel-phase4-audit-2026-07-28.md`  
- PRs KEEP: #161, #163, #164, #165, #166  
- `main`: `9a1cdc51`
