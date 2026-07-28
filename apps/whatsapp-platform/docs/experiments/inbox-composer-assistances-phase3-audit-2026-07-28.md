# Auditoria — Fatia 3 · Editor e assistências (Inbox)

Data: **2026-07-28**  
Branch base: `main` @ `c0cba12e` (merge [#164](https://github.com/devflow-modules/devflow/pull/164) — Fatia 2 KEEP)  
Escopo: **auditoria documental apenas** — nenhum componente, estilo, handler, contrato ou teste alterado  
Skills aplicadas (coordenadas, advisory nesta etapa): `product-grill`, `frontend-design`, `revenue-centric-design`, `nextjs-ui-polish`, `whatsapp-platform-safe-change`, `devflow-product-evidence`, `test-hardening` (só mapa de cobertura)

**Pré-condições confirmadas**

| Check | Resultado |
|---|---|
| PR #164 | **MERGED** em 2026-07-28T22:07:15Z · merge `c0cba12e` |
| `main` local | sincronizada com `origin/main` |
| Fatias 1–2 docs/evidence | lidas (`inbox-list-row-density-*`, `inbox-chat-header-*`) |
| Diff de produto nesta etapa | **nenhum** |

Legenda de afirmações: **FACT** = comprovado no código; **HYP** = hipótese de produto/design; **UNKNOWN** = sem evidência suficiente → `BLOCKED_BY_PRODUCT_DECISION` quando bloquear proposta.

---

## 1. Resumo executivo

O caminho do operador após abrir uma conversa passa por **header densificado (KEEP)**, **banner de ação** (quando aplicável), **lista de mensagens**, depois um bloco **`DealClosePanel` (“Registrar resultado”)** permanentemente **acima** do composer, e só então `MessageInput` — onde **dois `<details>`** (“Respostas rápidas e IA”, “Playbook — sugerir ação”) e, em mobile, uma **barra de 4 CTAs** ainda antecedem o textarea.

**Causa principal de competição (FACT):** várias superfícies de assistência e de resultado comercial partilham a mesma coluna vertical do chat e competem com o job “escrever e enviar”, sem hierarquia de *must-use-now* vs *on-demand*. O envio em si é simples (textarea + Enter/Enviar), mas o **caminho visual até ao campo** está rodeado de CTAs secundários e de um painel de negócio sempre presente.

Job do operador (referência):

1. entender a mensagem recebida;  
2. iniciar a resposta rapidamente;  
3. usar assistência só quando necessário;  
4. rever o conteúdo;  
5. enviar com segurança;  
6. registar resultado / avançar estado no momento adequado.

**Decisão desta auditoria:** `PROCEED_TO_VISUAL_PROPOSAL` — com bloqueios de produto explícitos (não resolvidos por suposição).

---

## 2. Escopo e fontes examinadas

### Em escopo

- Coluna de conversa: composer, assistências anexas, resultado/deal, banner de ação, relação com header/lista/painel.
- Contratos HTTP de send / suggest-reply / suggest-playbook / deal / typing / follow-up.
- Testes e E2E que tocam o composer.

### Fora de escopo (não redesenhar nesta fatia)

- Lista (Fatia 1 KEEP), `ChatHeader` (Fatia 2 KEEP), redesign do painel CRM completo, histórico/audit, prompts de IA, novas capacidades de mídia outbound.

### Fontes (FACT)

| Fonte | Path |
|---|---|
| Coluna chat | `ChatWindow.tsx` |
| Composer | `MessageInput.tsx`, `InboxComposerTextField.tsx` |
| Playbook UI | `PlaybookSuggest.tsx` |
| Resultado | `DealClosePanel.tsx` |
| Banner | `ConversationActionBanner.tsx`, `conversationActionBannerLogic.ts` |
| Follow-up | `followUpUtils.ts` |
| Sugestão lateral | `OperatorSuggestionPanel.tsx`, `operatorSuggestion.ts`, `LeadDataPanel.tsx` |
| Fetch | `inboxFetch.ts` |
| APIs | `api/inbox/conversations/[id]/send`, `suggest-reply`, `suggest-playbook`, `suggest-deal`, `close-deal`, `clear-deal-suggestion`, `typing`, `follow-up/log` |
| Testes | `inboxUi.test.tsx`, `followUpUtils.test.ts`, `conversationActionBannerLogic.test.ts`, `operatorSuggestion.test.ts`, `send/__tests__/route.test.ts`, `tests/e2e/inbox.spec.ts` |
| Docs KEEP | Fatias 1–2 em `docs/experiments/`; `DESIGN_SYSTEM.md` (tokens composer); `OPERATIONAL_PLAYBOOK.md` (canal ACTIVE) |
| Pré-condição | PR #164 MERGED |

---

## 3. Fluxo atual: leitura → composição → envio → resultado

```text
[Lista] selecionar conversa
    ↓
[ChatHeader] identidade / estado / Assumir|Encerrar|Mais     (Fatia 2 KEEP)
    ↓
[InternalNotesPanel?] se notas abertas
    ↓
[ConversationActionBanner?] “Responder agora” | Ocultar
    ↓
[MessageList] ler última(s) mensagem(ns)
    ↓
[DealClosePanel] Registrar resultado / sugestão / status won|lost   ← ACIMA do editor
    ↓
[Contexto do cliente bar?] md–lg / focus
    ↓
[MessageInput]
    · lock canal? · typing stub? · mobile quick bar?
    · follow-up banner?
    · erro de envio?
    · <details> Respostas rápidas e IA
    · <details> Playbook — sugerir ação
    · preview IA / playbook?
    · [textarea #inbox-composer] + [Enviar]
    ↓
POST /send (optimistic) → limpa texto → dismiss banner
    ↓
(opcional, momento separado) DealClose suggest/close
```

**FACT:** com `auditTab === true`, a coluna substitui lista+composer por `ChatAuditTab` — não se responde nessa vista.

**FACT:** `InboxComposerTextField` monta com `key={threadId}` → troca de conversa **descarta** o texto local sem aviso.

---

## 4. Inventário de componentes

| Componente | Papel | Onde fica |
|---|---|---|
| `ChatWindow` | Orquestra coluna + CRM | shell chat |
| `ChatHeader` | Identidade / ownership / Encerrar | topo coluna |
| `ConversationActionBanner` | Urgência + scroll ao composer | sob header |
| `MessageList` / `MessageBubble` | Leitura (+ preview mídia inbound) | meio |
| `DealClosePanel` | Resultado comercial | **entre lista e MessageInput** |
| `MessageInput` | Assistências + orquestra send | fundo coluna |
| `InboxComposerTextField` | Textarea + Enviar + typing POST | fundo de MessageInput |
| `PlaybookSuggest` | Intent / ação / resposta | dentro `<details>` playbook |
| `OperatorSuggestion` | Copy estática por `aiState` | tab no `LeadDataPanel` |
| `InternalNotesPanel` / `ChatAuditTab` | Notas / histórico | substitui ou sobrepõe fluxo |
| Mídia outbound | — | **ausente** no composer |

---

## 5. Inventário de handlers, permissões e contratos

| Ação | Client | API | Gate relevante (FACT) |
|---|---|---|---|
| Enviar texto | `sendInboxMessage` | `POST .../send` | Auth; usage `messages`; canal ACTIVE (`assertWhatsappPhoneNumberSendable`) |
| IA reply | `fetchSuggestedReply` | `POST .../suggest-reply` | Usage `ai` (402) |
| Playbook | `fetchPlaybookSuggestion` | `POST .../suggest-playbook` | Usage `ai` (402) |
| Templates rápidos | local `QUICK_TEMPLATES` | — | UI: `composerLocked` |
| Follow-up log | `logFollowUpUse` | `POST .../follow-up/log` | best-effort |
| Typing | `reportTyping` | `POST .../typing` | — |
| Suggest deal | `postSuggestInboxDeal` | `POST .../suggest-deal` | `ROLES_OPERATIONAL` |
| Close deal | `postCloseInboxDeal` | `POST .../close-deal` | `ROLES_MANAGER_PLUS` |
| Clear suggestion | `postClearDealSuggestion` | `POST .../clear-deal-suggestion` | `ROLES_MANAGER_PLUS` |
| Draft persistido | — | — | **não existe** |
| Upload mídia | — | — | **não existe** no composer |

**FACT — lock do composer:** `composerLocked` quando a linha WhatsApp da thread **não** está `ACTIVE`. Não depende de `CLOSED` / unassigned / `awaiting_*`.

**FACT — CLOSED:** banner some; header sem Assumir; **textarea continua habilitado** (send route não checa `status === "CLOSED"` no fluxo UI auditado).

**FACT — flags de plano:** `hasAiResponse` / playbooks existem no billing UI, mas o composer **não** esconde botões IA; o limite aparece no POST (402 → mensagem de erro).

---

## 6. Cobertura atual de testes

| Área | Cobertura (FACT) | Lacuna |
|---|---|---|
| Templates / follow-up / playbook preview / AI preview | `inboxUi.test.tsx` | — |
| Send optimistic, pending, retry | `inboxUi.test.tsx` + e2e fail/retry | — |
| Send API channel/usage | `send/__tests__/route.test.ts` | — |
| Banner variants | `conversationActionBannerLogic.test.ts` | — |
| Follow-up delay | `followUpUtils.test.ts` | — |
| Operator suggestion copy | `operatorSuggestion.test.ts` | — |
| DealClose UI / E2E | — | **sem E2E**; serviço `suggestDealService.test.ts` |
| Suggest-reply / playbook HTTP routes | — | **sem `__tests__` de rota** encontrados |
| Troca de conversa com texto digitado | — | **sem teste** de perda de rascunho |
| Mobile composer | e2e viewport 390 — `message-input` visível | assistências mobile não cobertas |

---

## 7. Anatomia visual atual

### Coluna (top → bottom) — FACT

1. Header (Zona A/B + Mais)  
2. Banner de ação (condicional)  
3. MessageList (flex)  
4. **DealClosePanel** (`placement="composer"`)  
5. Barra “Contexto do cliente” (condicional)  
6. **MessageInput** (assistências + textarea)

### Dentro de MessageInput (acima do textarea) — FACT

1. Aviso canal inativo  
2. Typing peers (query stub → lista vazia na prática)  
3. Mobile quick bar: Responder / Template / IA / Fechar venda  
4. Follow-up sugerido (≥4h `awaiting_customer`)  
5. Erro de envio + retry  
6. `<details>` Respostas rápidas e IA  
7. `<details>` Playbook — sugerir ação  
8. Erro / preview IA  
9. Textarea + Enviar + hint Enter

---

## 8. Ordem atual de atenção e interação

Ordem típica em conversa `awaiting_agent` + canal ACTIVE + operador (FACT + inferência de layout):

| # | Elemento | Tipo de decisão |
|---|---|---|
| 1 | Nome / estado / responsável (header) | contexto |
| 2 | Assumir? (se unassigned) | ownership |
| 3 | Banner “Cliente aguardando…” + Responder agora | urgência / scroll |
| 4 | Últimas mensagens | compreensão |
| 5 | Registrar resultado (summary sempre no DOM) | negócio |
| 6 | Abrir respostas rápidas / IA / playbook? | assistência |
| 7 | Escrever no textarea | composição |
| 8 | Enviar | commit |

**Etapas até começar a digitar (mínimo viable):** selecionar conversa → (opcional Assumir) → focar `#inbox-composer` — **~2–3 interações** se o operador ignorar tudo o resto.

**Etapas visuais competindo antes do campo:** tipicamente **4–7** blocos acima do textarea (banner + lista + deal + 2 details + mobile bar), mesmo recolhidos.

---

## 9. Elementos que antecedem ou competem com o editor

| Elemento | Compete? | Notas |
|---|---|---|
| DealClosePanel | **Sim** | Sempre na coluna acima do composer; summary “Registrar resultado…” |
| `<details>` rápidas+IA | **Sim (suave)** | Recolhido, mas ocupa faixa e Tab order |
| `<details>` playbook | **Sim (suave)** | Idem; preview abre painel grande |
| Follow-up banner | **Sim (condicional)** | Só `awaiting_customer` + ≥4h |
| Mobile quick bar | **Sim** | 4 botões antes do campo em &lt;md |
| Banner “Responder agora” | **Parcial** | Ajuda scroll; não foca textarea (`onRespondNow` no ChatWindow é no-op) |
| OperatorSuggestion (CRM) | **Fraco na coluna** | Fora do composer; tab “Sugestão de ação” |
| Header Assumir / Encerrar | **Separado** | Ownership/ciclo; não é composição |

---

## 10. Repetições com header, banner e painel

| Sinal | Onde se repete (FACT) |
|---|---|
| Precisa resposta / cliente à espera | Lista (Fatia 1), header estado, banner `customer_waiting` / `high_wait` |
| CTA de resposta | Banner “Responder agora”; mobile “Responder” (só `focus()`); Enviar |
| Assumir ownership | Header “Assumir” ≠ banner (rótulos distintos — KEEP Fatia 2) |
| “Sugerir ação” | Playbook no composer vs tab “Sugestão de ação” no CRM (`OperatorSuggestion` — copy estática, sem API) |
| Fechar / resultado | Header “Encerrar” (status thread) vs DealClose “Registrar resultado” (deal won/lost) — **conceitos diferentes** |
| SLA / wait | Header SLA-exceção; banner HIGH wait; lista wait-exceção |

---

## 11. Matriz de classificação dos elementos

| Elemento | Classificação | Notas |
|---|---|---|
| Textarea `#inbox-composer` | **ALWAYS_VISIBLE** + **PRIMARY_ACTION** (escrever) | Job central |
| Botão Enviar / Enter | **PRIMARY_ACTION** | |
| Lock canal ACTIVE | **STATE_DEPENDENT** | Bloqueia send + assistências |
| Erro envio + retry | **STATE_DEPENDENT** | |
| Respostas rápidas (chips) | **REVEAL_ON_DEMAND** | Já em `<details>`; conteúdo local |
| Gerar com IA + preview | **REVEAL_ON_DEMAND** | Mesmo details; 402 possível |
| Playbook “Sugerir ação” | **REVEAL_ON_DEMAND** | Details separado; compete semanticamente com CRM |
| Follow-up banner | **STATE_DEPENDENT** | `awaiting_customer` + 4h |
| Mobile quick bar | **STATE_DEPENDENT** (viewport) / candidato **REVEAL_ON_DEMAND** | |
| DealClosePanel | **ALWAYS_VISIBLE** hoje; produto: **AFTER_SEND** ou **REVEAL_ON_DEMAND**? | **BLOCKED_BY_PRODUCT_DECISION** |
| Banner ação | **STATE_DEPENDENT**; candidato **REMOVE_IF_REDUNDANT** vs header | **BLOCKED_BY_PRODUCT_DECISION** |
| OperatorSuggestion | **MOVE_TO_CONTEXT_PANEL** (já está) | Não mover para composer sem decisão |
| Encerrar (header) | fora do composer | Fatia 2 — não alterar |
| Assumir (header) | fora do composer | Fatia 2 — não alterar |
| Notas / Histórico | **REVEAL_ON_DEMAND** (Mais) | Fatia 2 |
| Draft persistido | — | **BLOCKED_BY_PRODUCT_DECISION** (hoje: só local) |
| Mídia outbound | — | não existe; não inventar |

---

## 12. Estados condicionais e dependências

| Estado | Efeito no editor (FACT) |
|---|---|
| Precisa resposta (`awaiting_agent` / needsHuman) | Banner; header estado; composer livre |
| Aguardando cliente | Possível follow-up ≥4h; sem banner de “cliente à espera” |
| Sem responsável | Sem lock composer; Assumir no header |
| Assumida pelo operador | Sem Assumir; Liberar no header |
| Encerrada (`CLOSED`) | Sem banner; composer **não** locked |
| Resposta vazia | Enviar disabled |
| Digitando | Typing POST; peers UI stub vazio |
| Envio pendente | Textarea+Enviar disabled; “A enviar…” |
| Falha envio | Banner vermelho + retry; texto em `retryText` |
| IA loading / erro | Chip “A gerar…” / mensagem erro; textarea livre |
| Rápidas / playbook aberto | Preview pode empurrar textarea |
| Deal pendente / won / lost | Painel muda copy; won/lost = status compacto |
| Troca de conversa com texto | **Perde rascunho** (`key={threadId}`) |
| Canal não ACTIVE | Lock total outbound + IA/templates/playbook |
| Desktop / estreito / mobile | Mobile: quick bar + CRM stack; e2e prova `message-input` em 390×844 |

---

## 13. Análise de respostas rápidas

- **FACT:** 5 templates hard-coded em `QUICK_TEMPLATES`; append ao editor; personalização `{{nome}}` se houver contacto.  
- **FACT:** Já recolhidas em `<details>` “Respostas rápidas e IA” (junto com IA).  
- **FACT:** Mobile “Template” aplica só o primeiro template (Saudação), sem abrir o details.  
- **HYP:** Agrupar com IA no mesmo details reduz cliques mas mistura “snippet local” com “geração paga”.  
- **Classificação proposta para próxima fase:** manter **REVEAL_ON_DEMAND**; avaliar separar IA vs templates (**BLOCKED** prioridade relativa).

---

## 14. Análise da assistência de IA

- **FACT:** `Gerar com IA` → preview → Usar no editor / Descartar / Enviar direto.  
- **FACT:** Loading e erro não desabilitam o textarea (só o botão IA durante pending).  
- **FACT:** Usage `ai` enforced no servidor; UI não pré-esconde por plano.  
- **FACT:** Enviar direto bypassa edição no textarea mas usa o mesmo `send` mutation.  
- **HYP:** Preview + “Enviar direto” aumenta risco de envio sem revisão.  
- **Invariante:** não alterar prompts/modelo nesta fatia.

---

## 15. Análise do playbook e sugestão de ação

- **FACT:** Playbook no composer: intent + ação recomendada + resposta → “Usar resposta no editor”.  
- **FACT:** CRM `OperatorSuggestion`: texto **estático** por `aiState`, sem API — tab “Sugestão de ação”.  
- **FACT:** Dois conceitos com nomes parecidos (“Sugerir ação” / “Sugestão de ação”) em sítios diferentes.  
- **Classificação:** playbook = **REVEAL_ON_DEMAND**; operator suggestion = **MOVE_TO_CONTEXT_PANEL** (já).  
- **BLOCKED_BY_PRODUCT_DECISION:** prioridade relativa playbook vs IA vs templates; se playbook deve sair do composer.

---

## 16. Análise do registro de resultado

- **FACT:** `DealClosePanel` com `placement="composer"` está **fixencionado** entre lista e MessageInput.  
- **FACT:** Operador sugere; manager confirma/fecha; estados won/lost mostram resumo.  
- **FACT:** Mobile “Fechar venda” apenas `scrollIntoView` no painel.  
- **FACT:** Independente de Encerrar conversa (status OPEN/CLOSED).  
- **UNKNOWN / BLOCKED:** deve o registo ser **AFTER_SEND**, **REVEAL_ON_DEMAND**, ou permanecer ALWAYS_VISIBLE por obrigação comercial?  
- **Outcome revenue-centric (HYP):** registo cedo demais atrasa resposta; registo tarde demais perde disciplina de CRM — precisa decisão humana, não inventar.

---

## 17. Teclado, foco e acessibilidade

| Item | FACT |
|---|---|
| Enter envia / Shift+Enter newline | Documentado no UI + código |
| Label sr-only do textarea | “Mensagem para o cliente” |
| Foco visível | Classes `df-focus-brand` / `df-field-control` no sistema |
| Banner “Responder agora” | Scroll para `#inbox-composer-anchor`; **não** chama `focus()` no textarea (`onRespondNow` é `() => {}`) |
| Escape | Fecha drawer CRM; **não** limpa composer |
| Details summaries | Clicáveis; ordem de tab antes do textarea |
| Histórico (header) | Nome acessível (Fatia 2) — fora desta fatia |

**HYP (nextjs-ui-polish):** “Responder agora” deveria focar o composer — mudança pequena, mas é polish de fluxo; marcar para proposta, não implementar agora.

---

## 18. Responsividade

| Viewport | FACT |
|---|---|
| Desktop xl | CRM lateral; composer sem quick bar |
| md–lg | Barra “Contexto do cliente” + drawer |
| &lt;md | Quick bar 2×2; CRM stack abaixo; `tallMobile` no textarea |
| E2E mobile | `Inbox smoke mobile` — `message-input` visível em 390×844 |

**UNKNOWN / BLOCKED:** “suporte mobile real” além do smoke (teclado virtual, safe-area, assistências) — há código + e2e mínimo, mas não gate operacional completo.

---

## 19. Invariantes funcionais

Não podem regredir numa futura simplificação visual:

1. `POST /send` + optimistic + retry + disable durante pending.  
2. Lock por canal não ACTIVE.  
3. Templates locais + IA suggest-reply + playbook suggest (APIs e usage).  
4. Deal suggest / close / clear com roles atuais.  
5. Follow-up banner + log.  
6. Typing report (mesmo com UI de peers stub).  
7. Isolamento por thread selecionada (`threadId`).  
8. Multitenancy / auth nas rotas existentes.  
9. Tokens `df-*` / classes inbox documentadas.  
10. Comportamento KEEP Fatias 1–2 (lista + header) intacto.  
11. Sem inventar mídia outbound ou draft server-side nesta fatia.

---

## 20. Riscos da futura simplificação

| Risco | Severidade | Mitigação |
|---|---|---|
| Esconder DealClose e perder disciplina comercial | Alta (produto) | Decisão BEFORE/AFTER_SEND explícita |
| Colapsar IA+templates+playbook num único controlo confuso | Média | Separar labels; testes inboxUi |
| Focar só textarea e esquecer 402/lock | Média | Preservar estados erro/disabled |
| Perda de rascunho na troca (já ocorre) | Média | Documentar; decisão de persistência |
| “Enviar direto” da IA sem revisão | Média | Manter ou pedir confirmação (produto) |
| Regressão Enter-to-send | Alta | Teste + e2e existentes |
| Empurrar assistências para CRM e aumentar switch de contexto | Média | Medir cliques na proposta |
| Alterar prompts/modelo “de passagem” | Alta | Fora de escopo explícito |

---

## 21. Decisões de produto bloqueadas

| ID | Questão | Porquê bloqueia |
|---|---|---|
| P1 | Momento de **Registrar resultado** (antes do send / depois / sob demanda) | Sem evidência de processo comercial canónico no código |
| P2 | Prioridade relativa **templates vs IA vs playbook** | Três canais de “ajuda a escrever” |
| P3 | Comportamento de **rascunho** ao trocar conversa (descartar silencioso vs confirmar vs persistir) | Hoje: discard silencioso |
| P4 | Necessidade de **persistência** de rascunho | Ausente |
| P5 | Banner “Responder agora” vs redundância com header/lista | Ajuda scroll mas não foca; copy sobrepõe “precisa resposta” |
| P6 | Automações **após envio** (abrir deal? marcar estado?) | Não implementadas no onSuccess além de dismiss banner + activation |
| P7 | Expectativa de **mobile** além do smoke | Código existe; rigor operacional UNKNOWN |
| P8 | Manter **Enviar direto** na preview IA | Risco de qualidade vs velocidade |

---

## 22. Hipóteses que exigirão gate humano

1. **HYP:** O campo de mensagem deve ser o âncora visual imediata após a lista; DealClose e assistências sob demanda.  
2. **HYP:** “Registrar resultado” após o envio bem-sucedido reduz atrito sem perder CRM.  
3. **HYP:** Um único controlo “Assistências” (rápidas | IA | playbook) basta; playbook pode viver no CRM.  
4. **HYP:** Banner pode degradar para chip no header ou sumir quando o header já diz “Precisa resposta”.  
5. **HYP:** Focar o textarea em “Responder agora” e no botão mobile “Responder” melhora TTFK (time-to-first-keystroke).  

Nenhuma destas é FACT — entram na **proposta visual** com alternativas e pergunta explícita.

---

## 23. Escopo seguro de uma futura proposta visual

Permitido na proposta (sem mudar regras):

- Reordenar / colapsar chrome **acima** do textarea (DealClose, details, mobile bar, follow-up).  
- Hierarquia tipográfica e densidade (`df-*`).  
- Labels e agrupamento de assistências.  
- Wireframes before/after + critérios de gate.  
- Marcar P1–P8 como opções A/B.

Proibido na proposta / implementação futura sem novo aceite:

- Mudar handlers, roles, usage, prompts, schema deal.  
- Redesign lista/header/painel completo.  
- Novos recursos (mídia, draft server).  
- Remover capacidades — só **revelar** / **reposicionar**.

---

## 24. Critérios para avançar

Checklist → `PROCEED_TO_VISUAL_PROPOSAL`:

- [x] Componentes e contratos relevantes localizados  
- [x] Caminho leitura → resposta documentado  
- [x] Principais vs auxiliares separados na matriz  
- [x] Condicionais ligados a estados reais  
- [x] Nenhuma capacidade precisa ser *apagada* para simplificar hierarquia  
- [x] Riscos de rascunho, envio, foco, troca de conversa explícitos  
- [x] Dúvidas de produto marcadas (P1–P8), não “resolvidas”  
- [x] Proposta visual isolada possível sem mudar regras de negócio  

---

## 25. Decisão final

### `PROCEED_TO_VISUAL_PROPOSAL`

Justificação: o inventário está fechado no código; a competição é estrutural (coluna vertical com deal + assistências antes do campo); a simplificação pode ser só de hierarquia/revelação; bloqueios de produto estão nomeados para o gate da proposta.

**Não** `ITERATE_AUDIT` — fontes principais cobertas.  
**Não** `BLOCK` — não falta owner de módulo nem contrato crítico inencontrável.

---

## Apêndice A — Respostas às 8 perguntas do brief

1. **Caminho atual:** selecionar → header → (banner) → ler lista → (deal) → (details/assistências) → textarea → Enviar.  
2. **Decisões antes do campo:** 0 obrigatórias além de selecionar; **visualmente** 4–7 blocos competem.  
3. **Essenciais a toda resposta:** textarea + Enviar (+ canal ACTIVE).  
4. **Sob demanda:** templates, IA, playbook, follow-up, deal (candidato), CRM suggestion.  
5. **Dependem do estado:** banner, follow-up, deal UI, lock canal, Assumir no header, CLOSED.  
6. **Atrasam:** DealClose sempre visível; details; mobile bar; previews; banner sem focus.  
7. **Repetições:** precisa resposta (lista/header/banner); sugerir ação (playbook vs CRM); CTAs de resposta.  
8. **Não mudar:** send/contracts/roles/usage/multitenant/thread/validações/assistências existentes/deal/estados erro/Enter/tokens/KEEP 1–2.

---

## Apêndice B — Confirmação de isolamento

- Diff de produto (tsx/css/handlers): **nenhum**  
- Commit / push / PR desta etapa: **nenhum**  
- Screenshots / evidência simulada: **nenhuma** (auditoria only)  
- Documento único criado: este ficheiro
