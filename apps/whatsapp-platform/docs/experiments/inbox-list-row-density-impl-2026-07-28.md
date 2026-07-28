# Implementação — Fatia 1 · Densidade da lista de conversas

Data: **2026-07-28**  
Branch: `experiment/inbox-list-row-density`  
PR: [#163](https://github.com/devflow-modules/devflow/pull/163)  
Proposta: [inbox-conversation-list-visual-proposal-2026-07-28.md](./inbox-conversation-list-visual-proposal-2026-07-28.md)

## Diff de produto

| Ficheiro | Mudança |
|---|---|
| `src/components/inbox/ConversationItem.tsx` | Anatomia densificada (+ assignee preservado) |
| `src/components/inbox/__tests__/inboxUi.test.tsx` | Regressão densificação |

Sem alteração a handlers, APIs, `ConversationsList` filtros, header, banner ou painel.

## Decisões de produto bloqueadas (comportamento atual)

1. **unread + pending** — ambos continuam visíveis quando &gt;0.  
2. **Responsável nomeado** — linha `assignee-line` mantida (nome ou “Sem responsável”).

## Removido da row

- CRM / prioridade / score / aiState / etapa / FU  
- Badge linha WhatsApp  
- Fila  
- ResponseAlertBadge textual  
- Chip unassigned duplicado  
- Chip awaiting_customer duplicado  
- Sugestão pendente  

## Mantido / ajustado

- Identidade, prévia, unread, pending, estado dominante, Assumir/Fechar  
- Wait SLA só como **exceção** (≥5 min alert ou sla high/critical)  
- Stripes selected / urgent / sem dono  

## Validações automatizadas

- `vitest` `inboxUi.test.tsx`: **21 passed**  
- CI #163: lint / test / quality / build / boundary / routing / a11y / Vercel — **SUCCESS**

## Método de evidência visual

Código de produto **congelado** durante o gate. Comparação via harness estático que espelha anatomia before (densidade pré-fatia) vs after (implementação #163):

- Harness: `docs/experiments/evidence/inbox-list-row-density-gate/harness.html`
- Desktop: `1440 × 900` · Mobile: `390 × 844`
- Estados cobertos: normal, unread, pending, unread+pending, responsável nomeado, sem responsável, SLA &lt;5m, SLA ≥5m, SLA critical, selecionada, foco teclado em Assumir

### Screenshots

| Arquivo | Conteúdo |
|---|---|
| `evidence/.../01-desktop-after-all.png` | After · todos os estados (desktop) |
| `evidence/.../02-desktop-before-all.png` | Before · mesmos estados densos |
| `evidence/.../03-mobile-after-all.png` | After · mobile 390×844 |
| `evidence/.../04-desktop-after-unowned-focus.png` | Tab → foco em Assumir (ring visível) |
| `evidence/.../05-desktop-after-unread-pending.png` | Unread + pending lado a lado |

## Gate humano — respostas

| # | Pergunta | Resultado |
|---|---|---|
| 1 | Mais rápido encontrar quem precisa de resposta? | **Sim** — badge único “Precisa resposta” sem stack CRM; scan ≤ before |
| 2 | Prévia domina sobre metadados? | **Sim** — faixa 2 imediata após identidade; chips CRM/linha/fila ausentes |
| 3 | unread + pending compreensível sem dois focos? | **Aceitável** — ambos preservados por bloqueio de produto; residual a fechar depois (não regressão desta fatia) |
| 4 | Responsável nomeado ajuda ou adensa? | **Ajuda sem reabrir relatório** — uma linha tipográfica pequena; bloqueio de produto respeitado |
| 5 | SLA só quando merece atenção? | **Sim** — &lt;5m mostra tempo relativo; ≥5m / critical mostra wait + stripe |
| 6 | Hover/foco/seleção sem só cor? | **Sim** — stripe + ring `focus-visible` + labels de estado |
| 7 | Truncamento destrutivo em viewport estreito? | **Não** — mobile harness sem overflow horizontal; truncate no nome/prévia |
| 8 | Assumir/Fechar/selecionar inequívocos no teclado? | **Sim** — Tab foca Assumir com ring brand (verificado via computed style) |

### Tempo de scan (manual)

| Métrica | Before | After |
|---|---|---|
| Localizar “Precisa resposta” na fila mista | Baseline alta (competição CRM/chips) | **Menor** — estado dominante + menos faixas (estimativa qualitativa no harness; sem cronómetro de operador real) |

## Decisão

**`KEEP`**

Scan claramente melhor; sem perda operacional nos bloqueios preservados; contratos intactos; CI verde. Residuais `unread/pending` e utilidade do responsável nomeado ficam como decisões de produto futuras — não como falha desta fatia.

Próxima fatia recomendada após merge: **cabeçalho da conversa** (`ChatHeader`), não o editor.

## Confirmação de congelamento no gate

- Sem novo diff em `ConversationItem` durante a coleta  
- Evidência + este documento apenas  
