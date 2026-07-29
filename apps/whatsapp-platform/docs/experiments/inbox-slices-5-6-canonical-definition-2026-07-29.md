# Definição canônica — Fatias 5 e 6 · Inbox WhatsApp Platform

Data: **2026-07-29**  
Repositório: `devflow-modules/devflow`  
Produto: **WhatsApp Platform Inbox** (`apps/whatsapp-platform`) — **não** Prospecta  
`main` de referência: `9a1cdc51` (merge [#166](https://github.com/devflow-modules/devflow/pull/166))  

Escopo deste documento: **somente definição de fatias**. Sem auditoria de implementação, sem proposta visual, sem código, sem commit/push/PR.

Gate atual: **BLOCK** para iniciar a auditoria da Fatia 5 até este documento ser **aceite humano** (PROCEED na definição).

---

## 1. Estado consolidado (FACT)

| Fatia | Tema | Decisão | PR |
|---|---|---|---|
| 0 (piloto) | Empty state da lista | KEEP | [#161](https://github.com/devflow-modules/devflow/pull/161) |
| 1 | Lista / `ConversationItem` | KEEP | [#163](https://github.com/devflow-modules/devflow/pull/163) |
| 2 | `ChatHeader` | KEEP | [#164](https://github.com/devflow-modules/devflow/pull/164) |
| 3 | Composer + assistências | KEEP | [#165](https://github.com/devflow-modules/devflow/pull/165) |
| 4 | Painel de contexto (`LeadDataPanel`) | KEEP | [#166](https://github.com/devflow-modules/devflow/pull/166) |
| **5** | *Definida abaixo* | — | — |
| **6** | *Definida abaixo* | — | — |

Arquitetura-alvo já referida na auditoria inicial da lista:

1. Navegação global recolhível  
2. Fila de conversas  
3. Conversa + editor  
4. Contexto do cliente sob demanda  

Fatias 1–4 cobriram **2**, grande parte de **3** (header + composer) e **4**. Permanecem: **chrome de urgência/resultado na coluna da thread**, **chrome do shell acima da fila**, e resíduos explicitamente adiados.

---

## 2. Princípio das fatias restantes

Cada fatia continua o mesmo protocolo:

`definição canônica (este doc) → auditoria documental → proposta visual → PROCEED → implementação isolada → evidência → KEEP | ITERATE | ROLLBACK | BLOCK`

Invariantes transversais (herdados de 1–4):

- Sem mudança silenciosa de handlers, contratos HTTP, permissões ou multitenancy.  
- Sem remover capacidades — só hierarquia / revelação / densidade.  
- Diff isolado por fatia; não redesenhar KEEP 1–4.  
- Tokens `df-*`, teclado, foco, nomes acessíveis, testids críticos.  
- Bloqueios de produto marcados, não resolvidos por estética.

---

## 3. O que ainda compete (base documental — FACT)

Fontes: auditorias/propostas Fatias 1–4; inventário `inbox-operational-hierarchy-phase1-2026-07-28.md`.

| Superfície | Ficheiros | Porquê ainda importa |
|---|---|---|
| Banner de ação | `ConversationActionBanner.tsx`, `conversationActionBannerLogic.ts` | Explicitamente **fora** das Fatias 2–3; repete “precisa resposta” / wait com lista e header |
| Registrar resultado | `DealClosePanel.tsx` | Sempre entre lista e composer; **P1** Fatia 3 (momento AFTER_SEND vs always) **não decidido** |
| Shell da Inbox | `InboxShell.tsx`, `InboxMetricsPanel.tsx`, filtros/chrome da página | Título, métricas, hints, filas — camadas **acima** da lista densificada; nunca densificadas nesta série |
| Timeline / bolhas | `MessageList.tsx`, `MessageBubble.tsx`, `ConversationTimeline.tsx` | Leitura da conversa; não densificada; menor competição com “camadas administrativas” que banner/deal/shell |
| Notas / Histórico | `InternalNotesPanel`, `ChatAuditTab` (entrada no header Mais) | Já sob demanda (Fatia 2); **não** são Fatia 5 nem 6 por defeito |

Residuais de produto **já nomeados** (não são fatias por si):

- Fatia 1: unread+pending; utilidade do responsável na row  
- Fatia 2: a11y do menu **Mais** (menu vs painel)  
- Fatia 3: P1–P8 (DealClose, rascunho, banner, mobile além smoke, etc.)  
- Fatia 4: C1–C8 (dedupe sugestões, focus mobile CRM, etc.)

---

## 4. Fatia 5 — Coluna da conversa: urgência e resultado

### Nome canônico

**Fatia 5 — Banner de ação e registro de resultado** (`ConversationActionBanner` + `DealClosePanel`)

### Job único

Depois de abrir a conversa, o operador deve **ler a última mensagem e responder** sem uma segunda pilha administrativa entre o histórico e o composer densificado (KEEP 3).

### Em escopo (quando a auditoria avançar)

- `ConversationActionBanner` e lógica associada.  
- `DealClosePanel` (`placement="composer"` e estados won/lost/sugestão).  
- Relação visual com header KEEP 2 (estado / Assumir) e composer KEEP 3 (sem redesenhar o editor).  
- Decisões de produto **já abertas** que esta fatia deve **endereçar no gate**, não esconder: sobretudo **P1** (momento do DealClose), **P5** (banner vs redundância), e roles deal já existentes.

### Fora de escopo

- `MessageInput` / templates / IA / Playbook (KEEP 3).  
- `ChatHeader` / Mais / notas / histórico (KEEP 2).  
- `LeadDataPanel` / Prospect (KEEP 4).  
- `ConversationItem` / filtros da lista (KEEP 1).  
- `InboxShell` métricas/título/filas (→ Fatia 6).  
- `MessageList` / bolhas (adiado; ver §6).  
- Novas automações pós-envio (P6) sem aceite explícito.

### Critério de sucesso (definição)

- Banner e DealClose deixam de competir como “painéis permanentes” com a leitura;  
- Capacidades e roles de deal **preservados**;  
- Nenhuma decisão P1/P5 resolvida só por preferência visual na auditoria — entram bloqueados ou opções A/B na proposta.

### Ordem na série

**Próxima a auditar** após aceite deste documento.

---

## 5. Fatia 6 — Shell operacional acima da fila

### Nome canônico

**Fatia 6 — Chrome do `InboxShell` (métricas, título e densidade acima da lista)**

### Job único

Ao entrar na Inbox, o operador deve encontrar a **fila densificada (KEEP 1)** sem atravessar um dashboard de métricas/título/hints que reconstitui o problema original de “camadas demais”.

### Em escopo (quando a auditoria avançar)

- `InboxShell.tsx` — PageHeader / título / descrição, toasts de ativação (apresentação), hints de pricing, modo foco.  
- `InboxMetricsPanel` (e `<details>` / revelação).  
- Densidade visual do chrome de filtros **sem** alterar contratos de filtro, URL, sticky groups ou sort (lógica de `ConversationsList` permanece).  
- Relação com modo foco já usado nas Fatias 3–4.

### Fora de escopo

- Lógica de filtros, query string, ordenação SLA, agrupamento.  
- Redesign da row (KEEP 1).  
- Coluna da conversa (KEEP 2–5, conforme já fechado).  
- Prospect metrics bar / gating admin (só se a auditoria provar overlap visual — default: não mover regras).  
- Navegação global do app shell (fora da Inbox), salvo constante de densidade já existente.

### Critério de sucesso (definição)

- A primeira viewport operacional privilegia a **lista**;  
- Métricas e chrome secundário sob demanda ou densificados;  
- Contratos de filtro/URL intactos.

---

## 6. Explicitamente adiadas (não são Fatia 5 nem 6)

| Tema | Motivo |
|---|---|
| `MessageList` / `MessageBubble` / timeline | Leitura; impacto menor na “pilha administrativa”; pode ser fatia futura **7+** se necessário |
| A11y do **Mais** (header) | Residual Fatia 2; PR pontual, não fatia de hierarquia |
| Persistência de rascunho / confirm na troca | P3–P4 Fatia 3 |
| Sync prospect ↔ dealStatus | C7 Fatia 4 |
| CRM no focus mobile | C5 Fatia 4 |
| Empty state | Já KEEP #161 |

Qualquer promoção destas para fatia numerada exige **nova definição canônica** (amend a este doc ou documento sucessor).

---

## 7. Sequência obrigatória

```text
[ ] Aceite humano deste documento (PROCEED na definição 5+6)
[ ] Auditoria documental Fatia 5  →  PROCEED_TO_VISUAL_PROPOSAL | ITERATE_AUDIT | BLOCK
[ ] Proposta visual Fatia 5       →  PROCEED | ITERATE | BLOCK
[ ] Implementação isolada Fatia 5 →  evidência → KEEP | …
[ ] Auditoria documental Fatia 6  →  …
[ ] … até KEEP Fatia 6
```

**BLOCK** permanece para a **auditoria** da Fatia 5 até o aceite da definição.

---

## 8. Decisão pedida ao humano

Confirmar ou emendar:

1. **Fatia 5** = Banner + DealClose (coluna da conversa).  
2. **Fatia 6** = Chrome do `InboxShell` acima da lista.  
3. Timeline/mensagens **fora** de 5 e 6.  
4. Protocolo de gate inalterado.

Opções de resposta:

| Decisão | Significado |
|---|---|
| **PROCEED** | Definição aceite; pode iniciar **só** auditoria documental da Fatia 5 |
| **ITERATE** | Emendar nomes/escopo 5↔6 neste doc antes de auditar |
| **BLOCK** | Não iniciar Fatia 5; falta alinhamento de produto |

---

## 9. Confirmação de isolamento

- Diff de produto (tsx/css/handlers): **nenhum**  
- Auditoria Fatia 5: **não iniciada** (BLOCK até PROCEED deste doc)  
- Commit / push / PR: **nenhum** (ficheiro na working tree até instrução)

---

## 10. Referências

- `inbox-operational-hierarchy-phase1-2026-07-28.md`  
- Fatias 1–4: `inbox-*-2026-07-28.md` / `inbox-composer-*` / `inbox-context-panel-*`  
- PRs KEEP: #161, #163, #164, #165, #166  
- `main`: `9a1cdc51`
