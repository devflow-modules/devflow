# Auditoria — Fatia 4 · Painel de contexto do cliente

Data: **2026-07-28**  
Branch base: `main` @ `03540ab9` (merge [#165](https://github.com/devflow-modules/devflow/pull/165) — Fatia 3 KEEP)  
Escopo: **auditoria documental apenas** — nenhum componente, estilo, handler ou teste alterado  

Pré-condições:

| Check | Resultado |
|---|---|
| Fatia 1 lista | KEEP (#163) |
| Fatia 2 header | KEEP (#164) |
| Fatia 3 composer | KEEP (#165) @ `03540ab9` |
| `main` local | sincronizada |

Skills (coordenadas, advisory): `product-grill`, `frontend-design`, `revenue-centric-design`, `nextjs-ui-polish`, `whatsapp-platform-safe-change`, `devflow-product-evidence`, `test-hardening` (mapa de cobertura).

Legenda: **FACT** · **HYP** · **UNKNOWN** / `BLOCKED_BY_PRODUCT_DECISION`

---

## 1. Resumo executivo

O painel `LeadDataPanel` (“Contexto do cliente”) é um **aside de leitura com quatro tabs** (Resumo · Próxima ação · CRM · Contexto). A **única escrita no painel** é a prospecção DevFlow (`DevFlowProspectPanel`), gated a `platform_admin`. Score, prioridade e `leadData` são **só leitura** (atualizados por heurística inbound fora do painel). Deal, tags e notas **não vivem no painel** — estão no composer (`DealClosePanel`) e no header.

**Problema operacional (FACT + HYP):** o painel compete como segundo relatório: estado/responsável repetem o header (KEEP Fatia 2); score/prioridade repetem-se entre tabs Resumo e CRM; “Próxima ação” (bullets) e “Sugestão de ação” (OperatorSuggestion) sobrepõem-se conceptualmente ao Playbook do composer (KEEP Fatia 3), sem executar ações.

**Job do operador neste painel:**

1. confirmar contexto do lead sem sair da conversa;  
2. ver score/prioridade/dados extraídos quando necessário;  
3. (admin) gerir prospecção;  
4. **não** substituir Assumir / Enviar / Registrar resultado.

**Decisão desta auditoria:** `PROCEED_TO_VISUAL_PROPOSAL` — inventário e contratos fechados; nenhuma capacidade deve ser removida por suposição.

---

## 2. Escopo e fontes examinadas

### Em escopo

- `LeadDataPanel` e filhos (`OperatorSuggestion`, `DevFlowProspectPanel`, copy/helpers).  
- Montagem em `ChatWindow` / `InboxShell` (xl / drawer / stack / focus).  
- Overlap com lista, header, banner, composer, DealClose.  
- Permissões e testes.

### Fora de escopo

- Redesign de lista/header/composer (KEEP 1–3).  
- Mudança de heurística `leadCrm` / prompts.  
- Mover deal/notas/tags para o painel sem proposta + aceite.

### Fontes (FACT)

| Fonte | Path |
|---|---|
| Painel | `LeadDataPanel.tsx` |
| Prospect | `DevFlowProspectPanel.tsx`, `devflowProspecting.ts`, `api/.../prospect` |
| Copy / estado | `leadPanelCopy.ts`, `conversationStateUi.tsx`, `operatorSuggestion.ts` |
| Fase CRM | `modules/inbox/leadCrm.ts` |
| Montagem | `ChatWindow.tsx`, `InboxShell.tsx` |
| Overlap | `ChatHeader`, `DealClosePanel`, `MessageInput`/`PlaybookSuggest`, `ConversationItem` |
| E2E | `tests/e2e/inbox.spec.ts` (lead-panel / score) |
| Docs | `docs/crm/CRM-ARCHITECTURE.md`, playbooks prospect, experiments Fatias 1–3 |

---

## 3. Fluxo atual: conversa ↔ painel

```text
Selecionar conversa
  → Header (KEEP) + Banner? + Mensagens + DealClose + Composer (KEEP)
  → LeadDataPanel:
       xl: coluna direita sempre (se chrome CRM)
       md–lg: barra “Contexto do cliente” → drawer dialog
       <md: stack sob o chat (max-h ~42vh)
       focus mode (!FREE): chrome off; md+ drawer on-demand; mobile sem CRM
       auditTab: painel desmontado
  → Tabs: resumo (default) | proxima | crm | contexto
```

---

## 4. Inventário de componentes

| Componente | Papel |
|---|---|
| `LeadDataPanel` | Shell tabs + secções |
| `OperatorSuggestion` | Citação estática por `aiState` |
| `DevFlowProspectPanel` | CRM prospecção (write) |
| `SupportHelpButton` | Só evaluationMode white-label |
| Helpers | `leadPanelCopy`, `conversationStateUi`, `deriveOperationalCrmPhase` |

---

## 5. Inventário de handlers, permissões e contratos

| Capacidade | No painel? | Mutação | Gate |
|---|---|---|---|
| Ver score / prioridade / leadData | Sim (leitura) | Não | Qualquer role com inbox |
| Ver estado / responsável / fase | Sim (leitura) | Não | — |
| Bullets “Próxima ação” | Sim (texto) | Não | — |
| OperatorSuggestion | Sim | Não | — |
| Patch prospect | Sim (tab CRM) | `PATCH .../prospect` | `platform_admin` + env kill-switch |
| Templates prospect (clipboard) | Sim | Não (clipboard) | Mesmo gate UI |
| Tags | **Não** | Header | — |
| Notas | **Não** | Header → InternalNotes | — |
| Deal won/lost/suggest | **Não** | DealClosePanel | manager / operator |
| Assumir / Encerrar | **Não** | Header | Fatia 2 |
| Editar score/prioridade | **Não** | Heurística inbound `leadCrm` | Backend |

**FACT:** o painel **não** é o owner de deal/notas/tags. Qualquer proposta que “mova” essas ações para o painel é mudança de produto, não densificação visual.

---

## 6. Cobertura atual de testes

| Área | Cobertura | Lacuna |
|---|---|---|
| E2E score no painel | `inbox.spec.ts` lead-panel / lead-score | Tabs, drawer, Escape, focus mode |
| OperatorSuggestion | unit + guided components | Sem LeadDataPanel |
| leadCrm / fase / prospecting flag | unit módulos | Sem UI LeadDataPanel |
| Vitest `LeadDataPanel` | **Ausente** | Tabs, assignee CLOSED, prospect gate |
| A11y drawer | Escape no ChatWindow | Sem focus trap / tabpanel |

---

## 7. Anatomia visual atual

```text
┌ Contexto do cliente          [X se drawer] ┐
│ [Resumo][Próxima ação][CRM][Contexto]      │
├────────────────────────────────────────────┤
│ Tab ativa (default Resumo):                │
│  · Avaliação? (FREE)                       │
│  · Situação: estado · fase · responsável   │
│  · Prioridade + score                      │
│ CRM: prioridade+score (dup) · funil · lead │
│      · DevFlowProspect? (admin)            │
│ Próxima: bullets estáticos                 │
│ Contexto: OperatorSuggestion               │
└────────────────────────────────────────────┘
```

---

## 8. Ordem atual de atenção (operador típico)

1. Mensagens + composer (KEEP 3) — job de resposta.  
2. Header — ownership / Encerrar.  
3. Abrir painel (xl já visível; senão “Contexto do cliente”).  
4. Tab Resumo — glance.  
5. Tab CRM — dados / prospect.  
6. Tabs Próxima / Contexto — raramente ações reais (só texto).

**HYP:** para responder, o painel é **secundário**; para fechar negócio / prospecção admin, o CRM tab importa.

---

## 9. Separação pedida pelo brief

| Categoria | Elementos no código | Classificação preliminar |
|---|---|---|
| Necessário para conduzir a conversa | Estado operacional, responsável (leitura), hint | ALWAYS_VISIBLE no painel **ou** aceitar header como fonte (evitar triplicar) |
| Comercial útil sob demanda | Score, prioridade, leadData, funil IA, fase comercial | REVEAL_ON_DEMAND (tab CRM / glance) |
| Ações que alteram CRM/deal | Prospect PATCH (no painel); deal/tags/notas **fora** | STATE_DEPENDENT / role; deal = AFTER_SEND ou keep composer (P1 Fatia 3) |
| Sugestões auxiliares | Bullets Próxima ação; OperatorSuggestion | REVEAL_ON_DEMAND; overlap Playbook |
| Redundantes | Estado/assignee vs header; score/prioridade Resumo↔CRM | REMOVE_IF_REDUNDANT **dentro do painel** (não apagar do produto) |
| Restritos por papel | DevFlowProspectPanel | STATE_DEPENDENT (`platform_admin`) |

---

## 10. Repetições com lista, header e composer

| Sinal | Lista | Header | Composer / Deal | Painel |
|---|---|---|---|---|
| Estado conversa | Badge | Badge | — | Resumo |
| Responsável | Linha | Texto + menus | — | Só leitura |
| Prioridade | Removida Fatia 1 | Removida Fatia 2 | Banner HIGH wait | Resumo **e** CRM |
| Score | Removido Fatia 1 | — | — | Resumo **e** CRM |
| Sugestão falar | — | — | Playbook + IA | OperatorSuggestion + bullets |
| Deal | — | Encerrar ≠ deal | DealClose | **Ausente** |
| Tags / notas | — | Mais | — | **Ausente** |

---

## 11. Matriz de classificação

| Elemento | Classe | Notas |
|---|---|---|
| Chrome “Contexto do cliente” + tabs | ALWAYS_VISIBLE (quando montado) | |
| Situação (estado/fase/responsável) | ALWAYS_VISIBLE em Resumo **ou** REVEAL se header bastar | **BLOCKED** se remover do painel |
| Score / prioridade glance | REVEAL_ON_DEMAND | Única superfície pós Fatias 1–2 |
| leadData extraído | REVEAL_ON_DEMAND (CRM) | |
| Funil IA label | REVEAL_ON_DEMAND | |
| Bullets Próxima ação | REVEAL_ON_DEMAND / REMOVE_IF_REDUNDANT? | Não executam; **BLOCKED** |
| OperatorSuggestion | REVEAL_ON_DEMAND / MERGE com CRM? | ≠ Playbook API |
| DevFlowProspectPanel | STATE_DEPENDENT (role) | Preservar integralmente |
| Evaluation block FREE | STATE_DEPENDENT | |
| Deal / tags / notas | Fora do painel | Não inventar move |
| Score edit UI | — | Não existe |
| Focus mode esconde CRM (mobile) | STATE_DEPENDENT | **BLOCKED** se mudar acesso |

---

## 12. Estados condicionais e dependências

| Estado | Efeito (FACT) |
|---|---|
| Sem thread | `null` |
| CLOSED | Assignee “—”; fase fechado possível |
| Unassigned | Texto “Sem responsável”; sem Assumir no painel |
| deal won/lost | **Sem** efeito no LeadDataPanel |
| evaluationMode (FREE) | Bloco avaliação; prospect off |
| inboxFocusMode | CRM off salvo FREE; drawer md+; **mobile sem CRM** |
| auditTab | Painel off |
| platform_admin + env | Prospect UI |
| Mudança thread | Remount `key`; fecha drawer |

---

## 13. Análise — contexto essencial vs secundário

**Essencial (HYP a validar na proposta):** o operador precisa de score/prioridade **algures** (já não estão na lista/header). O painel é hoje o **único glance** desses sinais — logo não são “lixo”; são **REVEAL** prioritário no painel, não candidatos a remoção.

**Secundário:** funil IA label, bullets genéricos, OperatorSuggestion (quando Playbook existe), duplicata score na tab CRM se Resumo já mostrou.

**Prospect admin:** essencial para persona `platform_admin` / tenant vendas DevFlow — não misturar com operador genérico.

---

## 14. Análise — ações CRM / deal

- **No painel:** só prospect PATCH.  
- **Deal:** composer (Fatia 3 P1).  
- **Tags/notas:** header Mais (Fatia 2).  

Proposta futura **não** deve “completar o CRM” movendo deal para o painel sem P-decisão explícita.

---

## 15. Análise — sugestões auxiliares

| Superfície | Fonte | Ação |
|---|---|---|
| Tab Próxima ação | `conversationStateSuggestedActions` | Texto |
| Tab Contexto | `generateOperatorSuggestion(aiState)` | Texto |
| Composer Playbook | API suggest-playbook | Insere no editor |
| Composer IA | suggest-reply | Preview / editor |

**HYP:** três “o que dizer a seguir” fragmentam atenção. Opções: fundir tabs, degradar OperatorSuggestion, ou apontar para Playbook — **BLOCKED_BY_PRODUCT_DECISION**.

---

## 16. Análise — prospecção DevFlow

- Gate role + kill-switch env.  
- Inclui edição em `<details>`, stages, follow-up, templates clipboard.  
- Modelo `salesStage` ≠ `dealStatus` do DealClose.  
- **Invariante:** não remover nem expor a operadores sem gate.

---

## 17. Teclado, foco e acessibilidade

**FACT**

- Tabs: `role="tablist"` / `tab` / `aria-selected`.  
- Drawer: `role="dialog"`, Escape fecha, backdrop, botão fechar.  
- Aside: `aria-label="Painel da conversa e lead"`.  

**Lacunas (FACT no código)**

- Sem `role="tabpanel"` / `aria-controls`.  
- Sem setas entre tabs.  
- Sem focus trap ao abrir drawer.  
- Escape não aplica ao stack mobile.

---

## 18. Responsividade e modo foco

| Viewport / modo | FACT |
|---|---|
| xl | Coluna ~260–280px |
| md–lg | Trigger + drawer |
| &lt;md | Stack max-h ~42vh |
| Focus + FREE | CRM visível |
| Focus + !FREE + md+ | On-demand drawer |
| Focus + !FREE + mobile | **Sem acesso CRM** |

**BLOCKED:** se produto exige CRM em focus mobile.

---

## 19. Invariantes funcionais

1. Leitura de `leadScore` / `priority` / `leadData` / estado / assignee.  
2. Tabs e testids (`lead-panel`, `lead-score`, `lead-tab-*`, …).  
3. Prospect PATCH + gate `platform_admin`.  
4. evaluationMode copy + SupportHelp.  
5. Montagem xl / drawer / stack / focus rules.  
6. Escape no drawer.  
7. Multitenancy / auth nas APIs existentes.  
8. Tokens `df-*`.  
9. KEEP Fatias 1–3 intactos.  
10. Não inventar edição de score/prioridade nem sync prospect↔deal.

---

## 20. Riscos da futura densificação

| Risco | Mitigação |
|---|---|
| Esconder score (único glance) | Manter glance no painel |
| Fundir tabs e perder prospect | Prospect continua gated e completo |
| “Mover deal para o painel” | Fora de escopo sem P-decisão |
| Focus mobile sem CRM | Marcar P-bloqueio |
| Regressão e2e score | Preservar testids |
| A11y tabs incompleta | Corrigir na implementação com cuidado |

---

## 21. Decisões de produto bloqueadas

| ID | Questão | Sem decisão → manter |
|---|---|---|
| **C1** | Estado/responsável no painel vs só header | Manter secção Situação |
| **C2** | Fundir / eliminar tabs Próxima + Contexto | Manter 4 tabs |
| **C3** | OperatorSuggestion vs Playbook (dedupe) | Ambos |
| **C4** | Score glance só Resumo vs também CRM | Duplicata atual OK |
| **C5** | CRM em focus mode mobile | Sem CRM (código atual) |
| **C6** | Mover deal/notas/tags para o painel | Ficam onde estão |
| **C7** | Sync prospect WON/LOST ↔ dealStatus | Modelos separados |
| **C8** | Default tab (resumo vs crm) | `resumo` |

---

## 22. Hipóteses para gate da proposta

1. **HYP:** Resumo deve ser um glance curto (estado + score/prioridade); CRM só dados + prospect.  
2. **HYP:** “Próxima ação” + “Contexto” podem virar uma secção ou linkar o Playbook.  
3. **HYP:** Drawer md deve ganhar focus trap sem mudar contratos.  
4. **HYP:** Stack mobile não deve roubar &gt;~30% da altura do chat sem collapse.

---

## 23. Escopo seguro de futura proposta visual

Permitido:

- Hierarquia/densidade das tabs e secções.  
- Evitar duplicar score/prioridade **dentro** do painel.  
- A11y tabs/drawer.  
- Wireframes xl / drawer / mobile / focus.  

Proibido sem aceite:

- Remover prospect, score, prioridade, leadData.  
- Alterar gates de role.  
- Mover deal/tags/notas.  
- Mudar heurística leadCrm / APIs.  
- Redesign KEEP 1–3.

---

## 24. Critérios para avançar

- [x] Componentes e contratos do painel localizados  
- [x] Essencial / comercial / ações / sugestões / redundâncias / roles separados  
- [x] Overlap com Fatias 1–3 documentado  
- [x] Escritas vs leituras claras  
- [x] Nenhuma remoção por suposição  
- [x] C1–C8 marcados  
- [x] Proposta visual isolada possível  

---

## 25. Decisão final

### `PROCEED_TO_VISUAL_PROPOSAL`

Inventário completo; o painel é sobretudo **contexto de leitura + prospect admin**; a densificação deve clarificar glance vs CRM vs sugestões auxiliares **sem** absorver deal/header/composer.

---

## Apêndice — Respostas ao foco da Fatia 4

1. **Contexto para conduzir:** estado, fase, responsável, hint (Resumo); score/prioridade como glance comercial.  
2. **Comercial sob demanda:** leadData, funil IA, prospect (admin), detalhe prioridade.  
3. **Ações CRM/deal:** prospect no painel; deal/tags/notas **fora**.  
4. **Sugestões auxiliares:** bullets + OperatorSuggestion (≠ Playbook).  
5. **Redundâncias:** estado/assignee vs header; score/prioridade entre tabs.  
6. **Restritos:** prospect `platform_admin` (+ env).

---

## Confirmação de isolamento

- Diff de produto: **nenhum**  
- Commit / push / PR: **nenhum**  
- Documento: este ficheiro (working tree)
