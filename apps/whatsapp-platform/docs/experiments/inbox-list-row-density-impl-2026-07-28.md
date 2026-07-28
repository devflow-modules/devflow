# Implementação — Fatia 1 · Densidade da lista de conversas

Data: **2026-07-28**  
Branch: `experiment/inbox-list-row-density`  
Proposta: [inbox-conversation-list-visual-proposal-2026-07-28.md](./inbox-conversation-list-visual-proposal-2026-07-28.md)

## Diff de produto

| Ficheiro | Mudança |
|---|---|
| `src/components/inbox/ConversationItem.tsx` | Anatomia 3 faixas (+ assignee preservado) |
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

## Validações

- `vitest` `inboxUi.test.tsx`: **21 passed** (após regressão densificação)  
- Gate evidência visual before/after: preencher na revisão humana / PR  

## Gate pós-evidência

`KEEP` | `ITERATE` | `ROLLBACK` | `BLOCK` — pendente comparação visual e medição manual de scan.
