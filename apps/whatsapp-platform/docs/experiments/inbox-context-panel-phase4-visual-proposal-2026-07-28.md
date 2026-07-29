# Proposta visual — Fatia 4 · Painel de contexto do cliente

Data: **2026-07-28**  
Base: [Auditoria Fatia 4](./inbox-context-panel-phase4-audit-2026-07-28.md) (`PROCEED_TO_VISUAL_PROPOSAL`)  
Pré-condição: `main` @ `03540ab9` · Fatias 1–3 KEEP  
Escopo: **proposta documental + wireframes** — sem código, commit, push ou PR  

Skills (coordenadas, advisory): `product-grill`, `frontend-design`, `revenue-centric-design`, `nextjs-ui-polish`, `whatsapp-platform-safe-change`, `devflow-product-evidence`, `test-hardening` (contratos).

Legenda: **FACT** · **HYP** · `BLOCKED_BY_PRODUCT_DECISION`

---

## 1. Resumo executivo

O `LeadDataPanel` já separa contexto em tabs, mas a **visão inicial (Resumo)** ainda funciona como mini-relatório, e a tab **CRM** **repete** score/prioridade. Sugestões textuais (Próxima / Contexto) competem semanticamente com o Playbook do composer sem oferecer ação.

**Princípio:** painel = contexto progressivo — (1) glance curto para conduzir, (2) comercial sob demanda, (3) Prospect estritamente gated, (4) deal/tags/notas **fora**.

**Direção recomendada:** Alternativa **B — Contexto progressivo**, implementável **dentro das quatro tabs** (respeitando C2 sem decisão), removendo apenas duplicação de **apresentação** de score/prioridade na tab CRM quando C4 for aceite no gate; sem C4, fallback = densificar Resumo e manter duplicata (caminho A).

**Decisão desta proposta:** `PROCEED` (gate humano antes de código).

---

## 2. Pré-condições e evidências

| Item | Estado |
|---|---|
| Auditoria Fatia 4 | Lida na íntegra |
| KEEP 1–3 | Docs/evidence list, header, composer |
| Código re-inspecionado | `LeadDataPanel`, `DevFlowProspectPanel`, `OperatorSuggestion`, `ChatWindow` mounts |
| E2E testids | `lead-panel`, `lead-score`, `lead-score-bar` (inbox.spec.ts) |
| Outros testids UI | `lead-tab-*`, `lead-panel-state-badge`, `lead-panel-assignee`, `operational-crm-phase`, `lead-score-panel`, `lead-score-panel-crm-tab`, `lead-priority-stripe` |
| Working tree | só auditoria untracked (+ este ficheiro) |

---

## 3. Diagnóstico confirmado

**FACT** (auditoria):

- Quatro tabs; leitura dominante; única escrita = Prospect (`platform_admin`).  
- Score/prioridade/`leadData` read-only.  
- Deal/tags/notas fora do painel.  
- Estado/fase/responsável no Resumo; estado/responsável também no header.  
- Score/prioridade = único glance comercial pós Fatias 1–2; duplicados Resumo↔CRM.  
- Bullets ≠ OperatorSuggestion ≠ Playbook.  
- Montagens: xl / drawer / stack / focus (mobile focus !FREE sem CRM).

---

## 4. Objetivos e princípios

1. Visão inicial **curta** (essencial + glance).  
2. Score/prioridade **sempre** de relance na abertura padrão.  
3. CRM detalhado **sob demanda** (tab CRM).  
4. Sugestões **auxiliares** e distintas do Playbook.  
5. Prospect **só** com gate.  
6. Zero mudança de contratos, ownership ou KEEP 1–3.  
7. C1–C8 **não** resolvidos por estética.

---

## 5. Anatomia atual do `LeadDataPanel`

```text
aside[data-testid=lead-panel]
  header “Contexto do cliente” + [X drawer]
  tablist: Resumo | Próxima ação | CRM | Contexto
  painel da tab ativa (default resumo)
```

Montagem (FACT): xl coluna; md–lg trigger+drawer `role=dialog`; &lt;md stack max-h; focus rules em `ChatWindow`.

---

## 6. Conteúdo e contratos das quatro tabs

| Tab | Conteúdo (FACT) | Contrato |
|---|---|---|
| Resumo | Avaliação FREE?; Situação (estado/fase/responsável/hint); Prioridade+score | Read-only; testids score |
| Próxima ação | Bullets `conversationStateSuggestedActions` | Texto; sem API |
| CRM | Prioridade+score (dup); funil IA; leadData; Prospect se gated | Prospect PATCH só admin |
| Contexto | `OperatorSuggestion` por `aiState` | Texto; sem API |

---

## 7. Redundâncias com lista, header e composer

| Sinal | Fora | No painel |
|---|---|---|
| Estado / responsável | Header (+ lista estado) | Resumo |
| Score / prioridade | Removidos lista/header | Resumo **e** CRM |
| “O que dizer” | Playbook/IA composer | Bullets + OperatorSuggestion |
| Deal / tags / notas | Composer / header | Ausentes (OUT_OF_SCOPE) |

---

## 8. Hierarquia visual pretendida

| Prioridade | Conteúdo |
|---|---|
| 1 | Score + prioridade (COMMERCIAL_GLANCE) |
| 2 | Estado / fase / responsável compactos (ESSENTIAL) — sem rivalizar CTAs do header |
| 3 | Entrada “Detalhes CRM” / tab CRM |
| 4 | leadData + funil (ON_DEMAND) |
| 5 | Prospect (CRM_ACTION, gated) |
| 6 | Sugestões auxiliares (tabs Próxima / Contexto) |

---

## 9. Matriz essencial / glance / on-demand / ação / sugestão / fora de escopo

| Classe | Elementos |
|---|---|
| ESSENTIAL_CONVERSATION_CONTEXT | Estado, fase, responsável (+ hint) |
| COMMERCIAL_GLANCE | Score, prioridade |
| COMMERCIAL_ON_DEMAND | leadData, funil IA, detalhe CRM |
| CRM_ACTION | DevFlowProspectPanel (`platform_admin`) |
| AUXILIARY_SUGGESTION | Bullets, OperatorSuggestion |
| OUT_OF_SCOPE | Deal, tags, notas, composer/header redesign |

---

## 10. Alternativa A — Conservadora

### Ideia

Manter **4 tabs** e interação; densificar tipografia/espaçamento; na tab CRM, **opcionalmente** enxugar copy duplicada sem remover nós (ou manter duplicata se C4 sem aceite); labels mais claras (“Sugestão textual” vs Playbook).

### Avaliação

| Critério | Nota |
|---|---|
| Tempo a compreender | ↑ ligeiro |
| Glance score/prioridade | Mantido no Resumo |
| Info inicial | Ainda média–alta |
| Redundância header | Quase igual |
| Clareza CRM / sugestões / Prospect | Melhora labels |
| Papéis | Intactos |
| xl / drawer / stack / focus | Intactos |
| Teclado | Igual (+ a11y tabpanel opcional) |
| Diff / risco | Baixos |
| Decisões produto | C1–C8 intactos |

---

## 11. Wireframes da Alternativa A

### A1 — Desktop xl, Resumo (lead com score)

```text
┌ Chat ──────────────┬ Contexto do cliente ─────┐
│ mensagens          │ [Resumo●][Próxima][CRM]… │
│ DealClose ▸        │ Situação (compacta)      │
│ composer KEEP      │ Estado · Fase · Resp.    │
│                    │ Prioridade Alta ████     │
│                    │ Score 72 / 100 ████      │
└────────────────────┴──────────────────────────┘
```

### A2 — Tab CRM (duplicata score ainda presente se C4 sem decisão)

```text
│ CRM e dados          │
│ Prioridade + Score   │  ← manter se C4 não aceite
│ Funil (IA) …         │
│ Nome / Interesse …   │
│ [Prospect admin]     │
```

### A3 — Sem permissão Prospect

```text
│ CRM: leadData + funil │
│ (sem bloco Prospect)  │
```

---

## 12. Alternativa B — Contexto progressivo

### Ideia

**Resumo = visão inicial única e curta:** glance score/prioridade em primeiro lugar + faixa essencial (estado/fase/responsável) tipograficamente secundária.  
**CRM = só on-demand:** leadData + funil + Prospect; **sem** segundo glance de score/prioridade (**proposta de apresentação**; depende de C4 no gate).  
**Próxima / Contexto:** mantidas (C2); copy deixa explícito “orientação textual — Playbook no composer”.  
Montagens xl/drawer/stack/focus **inalteradas** (C5).

### Avaliação

| Critério | Nota |
|---|---|
| Tempo a compreender | ↑↑ |
| Glance | Dominante no Resumo |
| Info inicial | Baixa |
| Redundância header | Situação compacta; CTAs só no header |
| Clareza CRM / sugestões / Prospect | Alta |
| Papéis | Prospect só admin |
| Responsivo | Mesmas 4 montagens |
| Diff / risco | Médio (LeadDataPanel + testes) |
| Decisões | C4 para tirar dup score; C2 se fundir tabs depois |

---

## 13. Wireframes da Alternativa B

### B1 — Desktop xl · visão inicial (default Resumo)

```text
┌────────────── Chat (KEEP) ──────────────┬─ Contexto ──────────┐
│ Header KEEP                             │ Contexto do cliente │
│ Mensagens …                             │ [Resumo●][Próx][CRM]│
│ ▸ Registrar resultado                   │ [Contexto]          │
│ [textarea][Enviar]                      │                     │
│ [Templates][IA][Playbook]               │ PRIORIDADE  Alta    │
│                                         │ ████████░░          │
│                                         │ SCORE  72 / 100     │
│                                         │ ████████████░░░░    │
│                                         │ Qualificado …       │
│                                         │ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│                                         │ Precisa resposta    │
│                                         │ Fase: Em atendimento│
│                                         │ Resp.: Você         │
└─────────────────────────────────────────┴─────────────────────┘
```

### B2 — Lead sem score/prioridade

```text
│ SCORE  0 / 100 (ou “—” se produto preferir label) │
│ Prioridade: (omitir stripe se !priority)          │
│ Situação compacta…                                │
```
(**FACT:** score default `?? 0` no código; wireframe não inventa campo novo.)

### B3 — CRM expandido (`leadData` completo + funil)

```text
│ Tab CRM●                                              │
│ Funil (IA): Qualificação                              │
│ Nome · Interesse · Orçamento · Urgência               │
│ ▸ Prospect DevFlow (só platform_admin)                │
│   (sem bloco score/prioridade — se C4 aceite)         │
```

### B4 — `leadData` ausente

```text
│ Ainda não há dados extraídos das mensagens.  │
```

### B5 — Sugestões (sem confundir com Playbook)

```text
│ Tab Próxima ação                                      │
│ Orientação textual (não envia mensagem)               │
│ • … bullets …                                         │
│ Dica: use Playbook/IA no composer para gerar texto.   │  ← HYP copy; não liga API

│ Tab Contexto                                          │
│ Sugestão                                              │
│ “Pergunte em que podemos ajudar…”                     │
```

### B6 — Prospect autorizado vs não

```text
Admin:  [DevFlowProspectPanel completo]
Outro:  CRM termina em leadData/funil; espaço Prospect omitido (FACT atual)
```

### B7 — Responsável ausente

```text
│ Resp.: Sem responsável   │  (Assumir continua só no header)
```

### B8 — Drawer viewport estreito

```text
│ [overlay]              ┌ dialog Contexto ──┐
│ chat dimmed            │ Resumo● …         │
│                        │ glance score      │
│                        │ situação compacta │
│                        │ scroll interno    │
│                        └───────────────────┘
```

### B9 — Stack / focus mobile

```text
│ Chat (maioria da altura)     │
│ Composer                     │
│ ─ stack max-h ─              │
│ Contexto (Resumo curto)      │  ← focus !FREE mobile: sem CRM (C5)
```

### B10 — Altura com scroll

```text
│ Resumo fixo no topo do scroll do aside │
│ (score visível sem scroll inicial)     │
│ Situação abaixo; overflow-y no body    │
```

---

## 14. Comparação das alternativas

| | A Conservadora | B Progressiva |
|---|---|---|
| Visão inicial | Tabs densificadas | Glance-first |
| Dup score Resumo/CRM | Pode permanecer | Remove apresentação (C4) |
| 4 tabs | Sim | Sim (C2) |
| Risco / diff | Menor | Médio |
| Alinhamento ao job | Parcial | Forte |

---

## 15. Direção recomendada

**Recomendar Alternativa B**, com implementação **conservadora nos bloqueios**:

- Sempre: densificar Resumo (score/prioridade primeiro; situação compacta).  
- C4 no gate: se aceite, CRM sem segundo glance; senão manter duplicata (comportamento A no CRM).  
- C2: **não** fundir tabs nesta PR.  
- C1: manter Situação no Resumo.  
- C3: manter ambas sugestões; só clarificar labels.  
- C5–C8: manter código atual.

---

## 16. Visão inicial proposta

Ao abrir o painel (default tab `resumo`, C8):

1. Prioridade (se existir) + score + label humana + barra (`lead-score`, `lead-score-bar`).  
2. Situação compacta: badge estado, fase, responsável.  
3. Hint operacional (se houver), tipografia menor.  
4. evaluationMode block (se FREE), sem empurrar o glance para baixo de forma destrutiva — colocar **após** glance se possível (**HYP** layout; evaluationBlock hoje precede Situação — proposta: glance primeiro).

---

## 17. Tratamento de score e prioridade

- **Único glance na abertura:** tab Resumo.  
- Texto + stripe/barra (não só cor).  
- Testids E2E no Resumo: **obrigatório** preservar `lead-score` e `lead-score-bar` no caminho default.  
- Tab CRM: sem repetir glance se C4 aceite; senão manter `lead-score-panel-crm-tab`.

---

## 18. Tratamento de estado, fase e responsável

- Permanecem no Resumo (C1).  
- Sem botões Assumir/Encerrar no painel (ownership no header).  
- Tipografia secundária ao glance.  
- “Sem responsável” / “—” em CLOSED inalterados.

---

## 19. Organização de CRM, `leadData` e funil de IA

Tab CRM:

1. Funil (IA) se `aiState`  
2. leadData rows (só preenchidos) / empty copy  
3. Prospect se `!evaluationMode && isDevFlowProspectingEnabled`  

Sem edição de score/prioridade/leadData.

---

## 20. Organização de bullets e `OperatorSuggestion`

| Tab | Papel | Diferenciação |
|---|---|---|
| Próxima ação | Checklist textual por `conversationState` | Não envia; ≠ Playbook |
| Contexto | Frase por `aiState` | Citação; ≠ Playbook |

Não unificar semanticamente com Playbook (C3).

---

## 21. Tratamento de Prospect e permissões

| Role | UI |
|---|---|
| `platform_admin` (+ env) | `DevFlowProspectPanel` na tab CRM |
| Outros / evaluationMode | Omisso — sem placeholder que sugira upgrade falso (**FACT:** hoje simplesmente não renderiza; manter) |

---

## 22. Estados vazios, loading, erro e indisponibilidade

| Estado | Tratamento |
|---|---|
| Sem priority | Omitir bloco prioridade |
| Score 0 | Barra em 0 + label (comportamento atual) |
| leadData vazio | Copy existente |
| Sem bullets / sem OperatorSuggestion | Empty copy existente |
| Funil sem aiState | Omitir linha funil |
| Prospect erro PATCH | Erro **dentro** do Prospect (componente atual) — não inventar |
| Loading funil | **N/A** no painel (dado já no thread) — não inventar skeleton |

---

## 23. Desktop `xl`

- Coluna 260–280px; body `overflow-y`.  
- Glance acima da dobra.  
- Chat + composer KEEP à esquerda.

---

## 24. Drawer

- Manter trigger “Contexto do cliente”, dialog, Escape, backdrop (FACT).  
- Proposta a11y (opcional na PR): focus no dialog ao abrir / devolver foco ao trigger — **sem** novo atalho.  
- Scroll só no corpo do painel; glance no topo.

---

## 25. Stack e focus/mobile

- Stack: max-h atual; Resumo curto reduz roubo de altura.  
- Focus !FREE mobile: **sem CRM** (C5) — wireframe documenta lacuna; não “inventar” acesso.  
- Focus md+: drawer on-demand inalterado.

---

## 26. Scroll, altura e densidade

- Aside body já `overflow-y-auto`.  
- Evitar múltiplas `panelSection` pesadas no Resumo (fundir Situação).  
- CRM/Prospect: Prospect continua com `<details>` editar.

---

## 27. Teclado, foco e acessibilidade

| Item | Proposta |
|---|---|
| Tab order | Tabs → conteúdo da tab → Prospect controls se visíveis |
| Troca de tab | `aria-selected`; ideal `tabpanel` + `aria-controls` (**polish**) |
| Prioridade/estado | Texto + padrão visual |
| Drawer | `role="dialog"` mantido; Escape existente |
| Sem `role="menu"` | Tabs ≠ menu |
| Escape novo | Não; só documentar o já existente no drawer |

---

## 28. Before / after esperado

| Before | After (B) |
|---|---|
| Resumo = situação + score empilhados “relatório” | Score/prioridade first; situação compacta |
| CRM repete score | CRM = dados + prospect (se C4) |
| Sugestões sem contexto vs Playbook | Labels “orientação textual” |
| 4 tabs | 4 tabs (C2) |

---

## 29. Invariantes funcionais

1. Glance score/prioridade disponíveis (Resumo).  
2. Read-only score/prioridade/leadData.  
3. Prospect gated `platform_admin`.  
4. Deal/tags/notas fora.  
5. 4 montagens + Escape drawer.  
6. E2E: `lead-panel`, `lead-score`, `lead-score-bar`.  
7. Demais testids se secções existirem.  
8. Multitenant / tokens / KEEP 1–3.  

---

## 30. Bloqueios C1–C8

Transcrição da auditoria + tratamento para implementação:

| ID | Questão (auditoria) | Atual (FACT) | Risco | Opções visuais | Evidência necessária | Sem decisão → |
|---|---|---|---|---|---|---|
| **C1** | Estado/responsável no painel vs só header | Secção Situação no Resumo | Ruído vs perda de contexto no aside | Compactar / omitir / keep | Gate operador | **Manter Situação** |
| **C2** | Fundir / eliminar tabs Próxima + Contexto | 4 tabs | Perder orientação / confundir com Playbook | Fundir / keep / link copy | Uso real | **Manter 4 tabs** |
| **C3** | OperatorSuggestion vs Playbook | Ambos | Fragmentação | Dedupe / keep / degradar | Entrevistas | **Manter ambos** |
| **C4** | Score glance só Resumo vs também CRM | Duplicata | Scroll CRM longo | Só Resumo / keep dup | Gate visual | **Duplicata OK** |
| **C5** | CRM em focus mode mobile | Sem CRM | Operador sem contexto | Expor drawer / keep | Sessão mobile | **Sem CRM** |
| **C6** | Mover deal/notas/tags para o painel | Fora | Scope creep | Move / keep | Produto | **Ficam onde estão** |
| **C7** | Sync prospect WON/LOST ↔ dealStatus | Modelos separados | Dados inconsistentes | Sync / keep | Ops/comercial | **Separados** |
| **C8** | Default tab resumo vs crm | `resumo` | Glance vs prospect-first | Trocar default | Admin vs operador | **`resumo`** |

---

## 31. Riscos

| Risco | Mitigação |
|---|---|
| E2E score parte se glance sair do default | Manter testids no Resumo montado |
| Compactar Situação demais (C1) | Não omitir sem C1 |
| Copy “use Playbook” parecer integração | Texto informativo apenas |
| Focus trap drawer regressão | Opcional; testar Escape |
| Scope Prospect UI | Não alterar formulário além de hierarquia pai |

---

## 32. Critérios de aceite da implementação

1. Abertura: score/prioridade identificáveis de relance.  
2. Resumo mais curto que o before.  
3. Sem remoção de dados/contratos.  
4. CRM acessível (tab).  
5. Sugestões ≠ Playbook (labels).  
6. Prospect só admin.  
7. Deal/tags/notas fora.  
8. xl/drawer/stack/focus contemplados (C5 documentado).  
9. E2E testids verdes.  
10. C1–C8 sem flips não autorizados.  
11. PR isolada; CI verde.

---

## 33. Plano de evidência visual

Após implementação (não agora):

- Harness ou app congelada: Resumo before/after; CRM; admin vs não-admin; drawer; stack.  
- Desktop 1440; drawer ~768–1024; mobile 390.  
- Gate KEEP / ITERATE / ROLLBACK / BLOCK.

---

## 34. Escopo seguro de uma única PR

**Incluir:** `LeadDataPanel.tsx` (ordem/densidade/labels; CRM sem dup glance **só se C4 aceite no PROCEED de implementação**); testes mínimos se necessário; doc impl + evidence.  

**Opcional polish:** `role="tabpanel"` / focus drawer em `ChatWindow` (sem mudar regras).  

**Excluir:** DealClose, ChatHeader, MessageInput, Prospect form fields, APIs, C2 merge de tabs, C5 focus mobile CRM.

---

## 35. Arquivos provavelmente afetados

| Ficheiro | Prob. |
|---|---|
| `LeadDataPanel.tsx` | Alta |
| `ChatWindow.tsx` | Baixa (a11y drawer opcional) |
| `leadPanelCopy.ts` / `conversationStateUi` | Baixa (só se copy) |
| `DevFlowProspectPanel.tsx` | Baixa |
| `inbox.spec.ts` | Só se testids moverem |
| Vitest novo LeadDataPanel | Média (recomendado) |
| `docs/experiments/...impl...` | Alta |

---

## 36. Decisão: PROCEED, ITERATE ou BLOCK

### `PROCEED`

Critérios do brief cumpridos: glance preservável; visão inicial encurtável; redundâncias de apresentação endereçáveis; CRM/sugestões/Prospect claros; OUT_OF_SCOPE respeitado; montagens cobertas; testids preserváveis; C1–C8 explícitos; PR isolável; contratos intactos.

---

## Apêndice — Respostas às 15 perguntas

1. **Imediato:** Resumo com score/prioridade + Situação compacta.  
2. **Glance:** só no Resumo (dup CRM sob C4).  
3. **Estado/fase/responsável:** Resumo, secundários (C1 keep).  
4. **vs Header:** sem CTAs no painel; tipografia secundária.  
5. **leadData/funil:** tab CRM.  
6. **Bullets / Operator / Playbook:** tabs textuais vs composer API; labels.  
7. **Prospect admin:** bloco na CRM.  
8. **Sem permissão:** omitido.  
9. **4 montagens:** inalteradas.  
10. **Drawer:** glance top + scroll body.  
11. **Focus mobile CRM:** C5 — sem acesso; não inventar.  
12. **Tabs combináveis:** só com C2; nesta PR não.  
13. **Dup apresentação:** score CRM (C4); copy Situação.  
14. **Empty/erro:** copies atuais; Prospect erros locais.  
15. **Testids:** `lead-panel` / `lead-score` / `lead-score-bar` no Resumo default.

---

## Confirmação de isolamento

- Diff de produto: **nenhum**  
- Commit / push / PR: **nenhum**  
- Entregável: este ficheiro
