# Proposta visual — Fatia 3 · Composer e assistências

Data: **2026-07-28**  
Base: [Auditoria Fatia 3](./inbox-composer-assistances-phase3-audit-2026-07-28.md) (`PROCEED_TO_VISUAL_PROPOSAL`)  
Pré-condição: PR [#164](https://github.com/devflow-modules/devflow/pull/164) MERGED (`c0cba12e`); Fatias 1–2 KEEP  
Escopo: **proposta documental + wireframes** — sem código, estilos de produto, handlers, commit, push ou PR  

Skills (coordenadas, advisory): `product-grill`, `frontend-design`, `revenue-centric-design`, `nextjs-ui-polish`, `whatsapp-platform-safe-change`, `devflow-product-evidence`, `test-hardening` (contratos a preservar).

Legenda: **FACT** · **HYP** · **BLOCKED_BY_PRODUCT_DECISION**

---

## 1. Resumo executivo

O envio já é simples (**FACT:** textarea + Enter / Enviar). A falha operacional é a **pilha vertical** entre a última mensagem e o campo: DealClose permanente, dois `<details>`, barra mobile de quatro CTAs e feedbacks empurram o composer para baixo.

**Princípio:** o composer (textarea + Enviar) é a superfície primária; templates, IA, playbook e registo comercial **apoiam** por divulgação progressiva — sem remover capacidades nem resolver P1–P8 por estética.

**Direção recomendada:** Alternativa **B — Hierarquia progressiva** (composer dominante + um único ponto de entrada para assistências + exclusividade de painel). Alternativa A fica como fallback de baixo risco.

**Decisão desta proposta:** `PROCEED` (gate humano antes de implementação).

---

## 2. Pré-condições e evidências utilizadas

| Item | Estado |
|---|---|
| Auditoria Fatia 3 | Lida na íntegra |
| Fatia 1 KEEP / #163 | Docs + evidence list densificada |
| Fatia 2 KEEP / #164 | Docs + evidence header densificado |
| Código re-inspecionado | `ChatWindow`, `MessageInput`, `InboxComposerTextField`, `DealClosePanel`, `PlaybookSuggest`, `ConversationActionBanner` |
| Anatomia desktop / mobile | Confirmada: DealClose entre lista e `MessageInput`; quick bar `showMobileQuickBar={!isMd}`; e2e 390×844 com `message-input` |

---

## 3. Problema operacional confirmado

**FACT**

- 4–7 blocos tipicamente acima do textarea.
- ~2–3 interações para começar a digitar se o operador ignorar assistências.
- DealClose com `placement="composer"` **sempre** na coluna acima do editor.
- Dois `<details>` + (mobile) grelha 2×2 competem pela mesma coluna.
- Troca de conversa: `key={threadId}` → rascunho local **descartado** sem aviso.
- Banner “Responder agora” faz scroll para `#inbox-composer-anchor`; `onRespondNow` no `ChatWindow` é no-op (não foca o textarea).

**Não é o problema:** ausência de send, IA, playbook ou deal — todos existem e têm contratos.

---

## 4. Princípios da proposta

1. **Composer-first** — textarea e Enviar dominam a última viewport da coluna.  
2. **Progressive disclosure** — assistências fechadas por defeito; uma aberta por vez.  
3. **Sem remoção de capacidade** — só reposicionar / agrupar / densificar.  
4. **Feedback junto à ação** — lock, pending, erro, retry colados ao composer.  
5. **P1–P8 explícitos** — opções documentadas; implementação sem decisão mantém comportamento atual nesses pontos.  
6. **Tokens `df-*`** e padrões Fatias 1–2 preservados.  
7. **Semântica correta** — painéis de assistência ≠ `role="menu"` com controlos complexos (lição residual Fatia 2).

---

## 5. Anatomia atual

```text
ChatHeader (KEEP)
ConversationActionBanner?
MessageList
DealClosePanel          ← sempre acima
Contexto do cliente?    ← md–lg
MessageInput
  lock? · mobile 4 CTAs? · follow-up?
  erro envio?
  <details> Rápidas + IA
  <details> Playbook
  preview IA?
  textarea + Enviar
```

---

## 6. Ordem atual de leitura e interação

1. Header (contacto / estado / Assumir|Encerrar)  
2. Banner urgência  
3. Mensagens  
4. Registrar resultado  
5. Assistências (mesmo fechadas)  
6. Campo + Enviar  

Job desejado: **3 → 6 → (assistência se preciso) → enviar → (resultado no momento comercial)**.

---

## 7. Hierarquia visual pretendida

| Prioridade | Superfície |
|---|---|
| 1 | Últimas mensagens (leitura) |
| 2 | **Textarea + Enviar** |
| 3 | Feedback de envio / lock / erro (STATE) |
| 4 | Entrada única “Assistências” (fechada) |
| 5 | Painel de **uma** assistência aberta |
| 6 | DealClose (posição provisória — ver §17) |
| 7 | Banner / follow-up (STATE) |

---

## 8. Matriz ALWAYS_VISIBLE / REVEAL / STATE / AFTER_SEND / BLOCK

| Elemento | Classe | Na proposta |
|---|---|---|
| Textarea + Enviar | ALWAYS_VISIBLE / PRIMARY | Dominantes; primeira superfície do composer |
| Lock ACTIVE / pending / erro / retry | STATE_DEPENDENT | Inline junto ao composer |
| Templates / IA / playbook | REVEAL_ON_DEMAND | Um entry point; exclusivos |
| OperatorSuggestion (CRM) | MOVE_TO_CONTEXT_PANEL | Mantém-se no painel (já está) |
| Follow-up ≥4h | STATE_DEPENDENT | Compacto; CTA “Usar” → editor |
| Banner ação | STATE_DEPENDENT | Mantém lógica; CTA foca composer (**HYP** polish) |
| DealClosePanel | AFTER_SEND **ou** BLOCKED | **Provisório:** densificar in-place; não mudar momento (P1) |
| Mobile 4 CTAs | — | **Eliminar pilha**; substituir por entry Assistências |
| Draft persist / confirm troca | BLOCKED P3–P4 | Documentar comportamento atual |
| Enviar direto (IA) | BLOCKED P8 | Manter botão existente na preview; não inventar novo |

---

## 9. Alternativa A — Conservadora

### Ideia

Menor diff estrutural: reutilizar `<details>`, inverter ordem interna (campo **antes** dos details), fundir os dois summaries num só, remover a grelha mobile de 4 botões.

### Mudanças visuais (proposta)

1. Ordem em `MessageInput`: feedback STATE → **textarea+Enviar** → um `<details>` “Assistências (templates, IA, playbook)”.  
2. Playbook e chips no mesmo painel expansível (ainda um details nativo).  
3. Mobile: sem grelha 2×2; o mesmo summary “Assistências” acima ou abaixo do campo (abaixo preferível).  
4. DealClose: inalterado em posição; summary mais compacto se já aberto (sem mudar APIs).  
5. “Responder agora”: além do scroll, `focus()` no `#inbox-composer` (**HYP** / polish — não muda contrato HTTP).

### Avaliação

| Critério | Nota |
|---|---|
| Tempo até escrever | Melhora moderada (campo sobe dentro do MessageInput; DealClose ainda acima) |
| Densidade vertical | −1 a −2 faixas (details fundidos + sem mobile 4 CTAs) |
| Clareza da ação principal | Boa |
| Compatibilidade componentes | Alta (`details`, testids existentes) |
| A11y / teclado | Boa; details nativos |
| Risco regressão | Baixo |
| Complexidade diff | Baixa–média |
| Desktop / mobile | Mobile ganha mais que desktop |
| Decisões produto | P1–P8 intactos |

---

## 10. Wireframes da Alternativa A

### Desktop — conversa assumida, canal ACTIVE, assistências fechadas

```text
┌─ Header (KEEP) ─────────────────────────────────────┐
│ Ana · Precisa resposta · Você    [Encerrar] [Mais]  │
├─ Banner? ───────────────────────────────────────────┤
│ Cliente aguardando…              [Responder agora]  │
├─ Mensagens (flex) ──────────────────────────────────┤
│ … última inbound …                                  │
├─ DealClose (provisório, mesma posição) ─────────────┤
│ ▸ Registrar resultado — sugestão ao gestor          │
├─ Composer ──────────────────────────────────────────┤
│ ┌────────────────────────────────────┐ ┌────────┐ │
│ │ Escreva a mensagem…                │ │ Enviar │ │
│ └────────────────────────────────────┘ └────────┘ │
│ Enter envia · Shift+Enter nova linha                │
│ ▸ Assistências (templates, IA, playbook)            │
└─────────────────────────────────────────────────────┘
```

### Desktop — IA aberta (único painel)

```text
│ ┌────────────────────────────────────┐ ┌────────┐ │
│ │ (textarea permanece visível)       │ │ Enviar │ │
│ └────────────────────────────────────┘ └────────┘ │
│ ▾ Assistências                                      │
│   [Saudação][Aguardar]…  [Gerar com IA]             │
│   ┌ Pré-visualização (IA) ─────────────────────┐   │
│   │ …texto…  [Usar no editor][Descartar]       │   │
│   │          [Enviar direto] ← P8 inalterado   │   │
│   └────────────────────────────────────────────┘   │
│   [Sugerir ação / playbook…]                        │
```

### Mobile — sem 4 CTAs

```text
│ [Mensagens]                                         │
│ ▸ Registrar resultado                               │
│ ┌ textarea ─────────────────────────────┐           │
│ │                                       │ [Enviar]  │
│ └───────────────────────────────────────┘           │
│ ▸ Assistências                                      │
```

---

## 11. Alternativa B — Hierarquia progressiva

### Ideia

Composer permanentemente dominante; **toolbar compacta** de um único entry “Assistências” com **região coordenada** (não dois details empilhados); **mutex**: abrir Templates fecha IA/Playbook e vice-versa; previews renderizam **numa única região** entre toolbar e (ou sobre) o campo, sem empilhar três blocos.

### Composição recomendada

```text
MessageList
DealClose (provisório: uma linha / <details> — mesma âncora #inbox-deal-close)
MessageInput / composer surface
  [STATE strips: lock | follow-up compacto | erro+retry]
  [textarea + Enviar]                    ← PRIMARY
  [Toolbar: Templates | IA | Playbook]   ← REVEAL triggers (aria-expanded)
  [Região única de assistência]          ← no máximo um painel
  hint teclado
```

**Não** usar `role="menu"` para o painel com chips, preview e botões complexos — usar `region` / `dialog` leve / `group` com `aria-label` (**FACT** residual Fatia 2 + a11y).

### Mutex (HYP de UX, implementação futura)

| Ação | Efeito |
|---|---|
| Abrir Templates | Fecha IA preview UI + fecha playbook preview |
| Abrir IA (gerar ou ver preview) | Fecha templates panel + playbook |
| Abrir Playbook | Fecha templates + IA panel |
| Usar no editor / Descartar | Fecha painel; foco volta ao textarea |
| Enviar (sucesso) | Fecha assistências; limpa preview (já ocorre em parte) |

### Mobile

- Remover grelha Responder / Template / IA / Fechar venda.  
- Textarea + Enviar em primeiro plano.  
- Toolbar em uma linha (scroll horizontal se preciso) ou um botão “Assistências” que abre a região.  
- “Fechar venda” / DealClose: continua acessível via painel existente (scroll) — **sem** quarto CTA permanente (**não** resolve P1).

### “Responder agora”

- Mantém scroll para `#inbox-composer-anchor`.  
- **Proposta:** também `composerRef.focus()` / focus em `#inbox-composer` (preenche o no-op atual). Não duplica Assumir.

---

## 12. Wireframes da Alternativa B

### B1 — Desktop, assumida, ACTIVE, vazio, assistências fechadas

```text
┌ Header KEEP ────────────────────────────────────────┐
│ João · Em atendimento · Você   [Encerrar][Liberar]… │
├ Mensagens ──────────────────────────────────────────┤
│ (última mensagem visível imediatamente acima)       │
├ DealClose provisório ───────────────────────────────┤
│ ▸ Resultado comercial                               │
├═ COMPOSER (superfície dominante) ═══════════════════┤
│ ┌──────────────────────────────────────┐ ┌────────┐│
│ │ Escreva a mensagem…                  │ │ Enviar ││
│ └──────────────────────────────────────┘ └────────┘│
│ [ Templates ]  [ IA ]  [ Playbook ]                 │
│ Enter envia · Shift+Enter nova linha                │
└─────────────────────────────────────────────────────┘
```

### B2 — Sem responsável + banner

```text
│ Header: Sem responsável · [Assumir] [Encerrar] …    │
│ Banner: Cliente aguardando… [Responder agora]→focus │
│ Mensagens …                                         │
│ ▸ Resultado comercial                               │
│ [textarea][Enviar]                                  │
│ [ Templates ][ IA ][ Playbook ]                     │
```

### B3 — Canal bloqueado

```text
│ ⚠ Envio e IA disponíveis quando o canal estiver ACTIVE │
│ [textarea disabled] [Enviar disabled]                   │
│ [ Templates disabled ][ IA disabled ][ Playbook dis. ]  │
```

### B4 — Pending / falha

```text
│ [textarea disabled] [A enviar…]                     │
── ou ──
│ ✗ Não enviámos a mensagem. [Tentar novamente]       │
│ [textarea com texto restaurado via retry path]      │
│ [Enviar]                                            │
```

### B5 — IA carregando / erro / aberta (mutex)

```text
│ [textarea — permanece editável] [Enviar]            │
│ [ Templates ] [ IA ● ] [ Playbook ]                 │
│ ┌ Região assistência ─────────────────────────────┐ │
│ │ A gerar…  /  Erro: limite ou falha (texto)      │ │
│ │ ou preview + Usar / Descartar / Enviar direto   │ │
│ └─────────────────────────────────────────────────┘ │
```

### B6 — Templates abertos / Playbook aberto

```text
│ Região: chips template-*  OU  PlaybookSuggest UI    │
│ (nunca ambos + IA ao mesmo tempo)                   │
```

### B7 — Follow-up ≥4h

```text
│ Strip compacta: Follow-up sugerido · [Usar texto]   │
│ (não empurra toolbar para fora da viewport)         │
│ [textarea][Enviar]                                  │
```

### B8 — Mobile 390 (comprovado pelo smoke)

```text
│ Mensagens                                           │
│ ▸ Resultado                                         │
│ ┌─────────────── textarea ───────────────┐          │
│ │                                        │ [Enviar] │
│ └────────────────────────────────────────┘          │
│ [Assistências ▾]   ← um controlo; abre região       │
│ (sem grelha 2×2)                                    │
```

---

## 13. Comparação das alternativas

| Critério | A Conservadora | B Progressiva |
|---|---|---|
| Tempo até escrever | ↑ moderado | ↑↑ (toolbar sob o campo; menos pilha) |
| Densidade vertical | Melhora parcial | Melhora material |
| Clareza PRIMARY | Boa | Melhor |
| Compatibilidade | Máxima | Alta (refactor layout MessageInput) |
| A11y | Details nativos | Exige região + aria-expanded bem feitos |
| Risco regressão | Menor | Médio (mutex, mobile) |
| Diff | Menor | Médio, ainda isolável |
| Mobile 4 CTAs | Removidos | Removidos + entry único |
| DealClose / P1 | Intocado | Intocado (só densificar UI) |

---

## 14. Direção recomendada

**Recomendar Alternativa B.**

Motivo (`product-grill` + `frontend-design` + `revenue-centric-design`): o outcome operacional é **time-to-first-keystroke** e menos competição visual; B alinha a hierarquia ao job sem apagar receita/ops (IA, playbook, deal). A complexidade extra (mutex, toolbar) cabe numa PR isolada do composer e é coberta pelos testes já existentes em `inboxUi` (templates, IA, playbook, send, retry).

Se o gate humano preferir risco mínimo absoluto → **ITERATE** para A primeiro; não é `BLOCK`.

---

## 15. Anatomia proposta do composer (B)

```text
#inbox-composer-anchor
  STATE: lock | follow-up | send error+retry
  PRIMARY: #inbox-composer + [Enviar]  (df-inbox-send-primary)
  TOOLBAR: Templates | IA | Playbook   (aria-expanded / controls)
  REGION:  painel exclusivo (templates | ai-preview | playbook-preview)
  HINT:    Enter · Shift+Enter
```

Testids existentes a preservar: `message-input`, `send-button`, `template-*`, `btn-ai-suggest`, `ai-preview`, `btn-playbook-suggest`, `playbook-preview`, `follow-up-banner`, `inbox-deal-close`.

---

## 16. Organização de templates, IA e playbook

| Ferramenta | Entrada | Conteúdo | Prioridade relativa |
|---|---|---|---|
| Templates | Toolbar “Templates” | Chips atuais | **P2 BLOCKED** — UI trata iguais |
| IA | Toolbar “IA” | Gerar + preview + ações atuais | **P2 / P8** |
| Playbook | Toolbar “Playbook” | `PlaybookSuggest` intacto | **P2** |

Sugestão de próxima ação estática (`OperatorSuggestion`) permanece no **CRM** — não entra na toolbar (evita terceira “sugerir ação” no composer).

---

## 17. Tratamento provisório do DealClosePanel

**Não decide P1.**

| Aspeto | Proposta sem decisão de produto |
|---|---|
| Posição | **Mantém** entre `MessageList` e `MessageInput` (**FACT** atual) |
| Densidade | Preferir summary de uma linha / `<details>` já usado no fluxo operador; evitar formulário expandido por defeito |
| Capacidades | suggest / close / clear / roles **inalterados** |
| Mobile | Sem CTA “Fechar venda” permanente; operador abre o summary DealClose na coluna |
| Após P1 | Opções futuras: AFTER_SEND sheet, REVEAL no CRM, ou keep always — **fora desta PR** |

---

## 18. Banner, follow-up e bloqueios

| Elemento | Tratamento proposto |
|---|---|
| Banner | Lógica `computeConversationActionBanner` intacta (**P5** aberto). CTA: scroll **+ focus** composer |
| Follow-up | Strip STATE acima do textarea; “Usar texto sugerido” mantém API log |
| Lock ACTIVE | Aviso + disabled em send/assistências (já existe) |
| CRM “Contexto do cliente” | Fora do escopo visual do composer (não redesenhar) |

---

## 19. Estados de envio, erro e retry

| Estado | UI proposta |
|---|---|
| Vazio | Enviar disabled |
| Com texto | Enviar enabled |
| Pending | Textarea+Enviar disabled; label “A enviar…” |
| Error | `role="alert"` acima do campo; retry; foco permanece no composer / retry |
| Success | Clear texto; fechar região assistência; banner dismiss (já) |

IA loading/erro: **só na região de assistência** — não desabilita textarea (**FACT** atual a preservar).

---

## 20. Rascunho e troca de conversa

| Aspeto | Comportamento nesta proposta |
|---|---|
| Persistência | **Nenhuma nova** (P4) |
| Troca de thread | Continua discard via remount `key={threadId}` (P3) |
| Wireframe / doc | Nota tipográfica opcional no doc de evidência: “rascunho não é guardado” — **sem** modal de confirmação até P3 |

---

## 21. Teclado, foco e acessibilidade

### Ordem de Tab (composer, B)

1. Textarea `#inbox-composer`  
2. Enviar  
3. Templates → IA → Playbook  
4. Conteúdo do painel aberto (chips / Usar / Descartar / …)  
5. (DealClose summary, se na tab order da coluna — posição atual)

### Foco

| Evento | Destino |
|---|---|
| Abrir assistência | Primeiro controlo do painel **ou** manter no trigger (`aria-expanded`) — preferir trigger + anunciar região |
| Fechar / Usar no editor | Textarea |
| “Responder agora” | Textarea |
| Erro de envio | Manter no composer; retry focável |
| Escape | **Só** se já existir no fluxo (CRM drawer). **Não** propor Escape no composer como contrato novo sem aceite — opcional futuro: fechar região assistência (**HYP**, documentar como polish opcional, não requisito P0) |

### Regras

- Nomes acessíveis: “Mensagem para o cliente”, “Enviar”, “Templates”, “IA”, “Playbook”, previews com headings.  
- Estado não só por cor (`df-feedback-*`, texto).  
- Operação completa sem rato.  
- Região de assistência: **não** `role="menu"` genérico.

### Enter / Shift+Enter

**Invariante absoluto** — comportamento atual de `InboxComposerTextField` inalterado.

---

## 22. Desktop e viewport estreito

- Composer fixo no fundo da coluna (`shrink-0`); lista `flex-1`.  
- Toolbar numa linha; wrap só se &lt;~360px de largura útil.  
- Preview IA/playbook com `max-height` + scroll interno para não empurrar Enviar para fora.  
- DealClose provisório: altura mínima quando fechado.

---

## 23. Mobile comprovado

- Base: e2e `Inbox smoke mobile` (390×844) — `message-input` visível (**FACT**).  
- Proposta: eliminar 4 CTAs; textarea dominante; Assistências sob demanda.  
- Safe-area padding atual do `MessageInput` preservado.  
- **P7:** não afirmar paridade operacional completa além do smoke; gate de evidência pedirá screenshot 390 na implementação.

---

## 24. Before / after esperado

| Before | After (B) |
|---|---|
| DealClose + 2 details + (mobile) 4 CTAs **acima** do campo | Campo + Enviar primeiro no composer; assistências abaixo/toolbar; mobile sem grelha |
| Dois painéis podem coexistir mentalmente | Mutex: uma assistência |
| Responder agora só scroll | Scroll + focus |
| Pilha 4–7 blocos | Redução material na zona MessageInput; DealClose densificado mas presente (P1) |

---

## 25. Invariantes funcionais

1. `POST /send` + optimistic + retry + pending  
2. Lock canal não ACTIVE  
3. Templates / suggest-reply / suggest-playbook + usage  
4. Deal suggest/close/clear + roles  
5. Follow-up + log  
6. Typing report  
7. Thread isolada / multitenant / auth  
8. Enter / Shift+Enter  
9. Testids críticos de composer  
10. Tokens `df-*`  
11. KEEP Fatias 1–2 (lista, header)  
12. Sem novos prompts, mídia outbound, ou draft server  

---

## 26. Decisões P1–P8

| ID | Atual (FACT) | Risco | Opções | Evidência necessária | Sem decisão → manter |
|---|---|---|---|---|---|
| **P1** Momento DealClose | Sempre acima do composer | Atraso vs perda CRM | AFTER_SEND / REVEAL / keep | Processo comercial / gestores | Posição atual + densificar UI |
| **P2** Prioridade templates/IA/playbook | Três canais paralelos | Toolbar “igual” mascara prioridade | Ordenar / defaults | Uso real / entrevistas | Triggers iguais na toolbar |
| **P3** Rascunho na troca | Discard silencioso | Perda de texto | Confirm / keep-in-memory | Incidentes ops | Discard atual |
| **P4** Persistência rascunho | Não existe | Complexidade / PII | LocalStorage / server / não | Necessidade medida | Sem persistência |
| **P5** Banner vs redundância | Banner + header “precisa resposta” | Ruído | Enxugar / fundir / keep | Gate visual | Lógica banner atual + focus |
| **P6** Pós-envio | Só dismiss banner + activation | Oportunidade CRM | Abrir deal / noop | Produto | Noop além do atual |
| **P7** Mobile além smoke | Código + e2e mínimo | Falso conforto | Gate mobile alargado | Sessão real | Smoke + screenshots proposta |
| **P8** Enviar direto IA | Botão na preview | Envio sem revisão | Remover / confirmar / keep | Qualidade respostas | Manter botão existente |

---

## 27. Riscos

| Risco | Mitigação |
|---|---|
| Mutex quebrar testes que abrem details em sequência | Atualizar inboxUi para abrir via toolbar |
| Preview alto esconder Enviar | max-height + scroll na região |
| Operadores habituados à grelha mobile | Entry “Assistências” óbvio; evidência mobile |
| Densificar DealClose esconder formulário | Summary claro “Registrar resultado” |
| Focus “Responder agora” inesperado | Comportamento aditivo; banner dismiss intacto |
| Scope creep para CRM/header | PR só MessageInput (+ CSS mínimo) + testes |

---

## 28. Critérios de aceite da futura implementação

1. Textarea acessível sem assistências abertas por defeito.  
2. Enviar sempre reconhecível (`df-inbox-send-primary`).  
3. Templates, IA e playbook disponíveis e testados.  
4. Lock / pending / erro / retry claros junto ao composer.  
5. P1–P8 não “resolvidos” por código além do “manter atual”.  
6. Pilha vertical do MessageInput reduzida (sem 2 details + sem 4 CTAs).  
7. Tab / focus / nomes acessíveis documentados e verificáveis.  
8. Mobile sem quatro CTAs concorrentes acima do campo.  
9. Diff isolado; contratos HTTP inalterados.  
10. Vitest composer + e2e send/retry verdes.

---

## 29. Plano de evidência visual

Após implementação (não nesta etapa):

- Harness estático before/after (padrão Fatias 1–2) **ou** captura app com código congelado.  
- Desktop 1440×900: fechado / IA aberta / erro send / lock / follow-up.  
- Mobile 390×844: composer dominante + Assistências.  
- Teclado: Tab até Enviar; focus ring visível.  
- Gate: KEEP / ITERATE / ROLLBACK / BLOCK.

---

## 30. Escopo seguro de uma única PR futura

**Incluir**

- `MessageInput.tsx` (layout, toolbar, mutex UI, remover mobile 4-CTA).  
- Possível CSS mínimo tokens já usados (`df-inbox-*`).  
- `ChatWindow.tsx` apenas se necessário para `onRespondNow` → focus (1 linha).  
- Testes `inboxUi.test.tsx` (+ e2e se seletores de details mudarem).  
- Doc impl + evidence.

**Excluir**

- DealClose lógica/roles; lista; header; CRM; prompts; draft persist; P1–P8 product flips.

---

## 31. Arquivos que provavelmente seriam afetados

| Ficheiro | Probabilidade | Motivo |
|---|---|---|
| `MessageInput.tsx` | Alta | Anatomia B |
| `InboxComposerTextField.tsx` | Baixa | Só se focus API |
| `ChatWindow.tsx` | Média-baixa | focus em Responder agora |
| `PlaybookSuggest.tsx` | Baixa | Reuso |
| `DealClosePanel.tsx` | Baixa | Só densidade visual opcional |
| `globals.css` / tokens | Baixa | Toolbar |
| `__tests__/inboxUi.test.tsx` | Alta | Abertura assistências |
| `tests/e2e/inbox.spec.ts` | Baixa–média | Se depender de details |
| `docs/experiments/...impl...` | Alta | Gate |

---

## 32. Decisão: PROCEED, ITERATE ou BLOCK

### `PROCEED`

Critérios do brief:

| Critério | Met? |
|---|---|
| Textarea acessível sem assistências abertas por defeito | Sim (B) |
| Enviar reconhecível | Sim |
| Templates/IA/playbook disponíveis | Sim |
| Estados envio/lock claros | Sim |
| P1–P8 não resolvidos por suposição | Sim (§26) |
| Reduz pilha vertical materialmente | Sim (B) |
| Teclado/a11y definidos | Sim (§21) |
| Mobile sem 4 CTAs | Sim |
| PR isolada possível | Sim (§30) |
| Contratos intactos | Sim |

**Alternativa A** permanece fallback se o gate preferir diff mínimo → escolher A seria `PROCEED` com direção A, não `BLOCK`.

---

## Apêndice — Respostas concretas às 12 perguntas

1. **Hierarquia:** composer no fundo da coluna, superfície dominante após mensagens.  
2. **Junto ao textarea:** Enviar + strips STATE; toolbar de triggers.  
3. **Acesso assistências:** toolbar / entry único — não nova pilha de details.  
4. **Padrão B:** toolbar compacta + **região expansível única** (não abas obrigatórias; não menu semântico).  
5. **Uma de cada vez:** mutex de painéis.  
6. **DealClose:** posição atual; densificar; P1 aberto.  
7. **Rascunho:** documentar discard; sem persistência/confirm (P3–P4).  
8. **IA loading/erro:** só na região; textarea livre.  
9. **Enter / Shift+Enter:** invariantes.  
10. **Mobile:** remover 4 CTAs; Assistências sob demanda.  
11. **Responder agora:** scroll + focus; sem segundo Assumir.  
12. **Locked/pending/failed:** inline no composer, junto a Enviar.

---

## Confirmação de isolamento

- Diff de produto: **nenhum**  
- Commit / push / PR: **nenhum**  
- Entregável único: este ficheiro
