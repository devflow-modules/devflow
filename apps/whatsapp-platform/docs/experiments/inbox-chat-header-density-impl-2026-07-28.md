# Implementação — Fatia 2 · Densidade do ChatHeader

Data: **2026-07-28**  
Branch: `experiment/inbox-chat-header-density`  
Proposta: [inbox-chat-header-visual-proposal-2026-07-28.md](./inbox-chat-header-visual-proposal-2026-07-28.md)  
Auditoria: [inbox-chat-header-phase1-2026-07-28.md](./inbox-chat-header-phase1-2026-07-28.md)

## Diff de produto

| Ficheiro | Mudança |
|---|---|
| `src/components/inbox/ChatHeader.tsx` | Anatomia Zona A / B + menu Mais |
| `src/components/inbox/__tests__/inboxUi.test.tsx` | Tags via Mais; SLA só em exceção |
| `tests/e2e/inbox.spec.ts` | Abrir Mais antes do trigger de estado |

Sem alteração a handlers, APIs, permissões, banner, lista, painel, editor ou histórico.

## Anatomia

### Zona A — identidade e estado

- Nome (+ telefone sob o título quando aplicável)
- Badge de estado operacional
- SLA só como **exceção** (`getResponseAlertLevel` ≠ none ou `slaLevel` high/critical)
- Linha curta de responsável (leitura)

### Zona B — operação

- **Assumir** (quando `canAssume`) — único primary; label curto “Assumir”
- **Encerrar** / **Reabrir** sempre nesta zona (nunca só em Mais)
- **Liberar** quando aplicável
- Menu **Responsável**
- **Mais** — Estado da thread, tags, notas, Histórico, linha, fila

## Removido da faixa principal

- Chip OPEN/CLOSED/PENDING permanente
- Prioridade HIGH
- Linha WhatsApp sempre visível
- Select Fila permanente
- Tags inline + “+ Tag”
- Notas / Histórico como pills na faixa
- `AgentStatusBadge`

## Assumir × banner

Banner continua com CTA **“Responder agora”** (fora do escopo). Header usa **“Assumir”** — sem duplicar o mesmo rótulo.

## Histórico (a11y)

Botão com nome acessível **“Histórico”** / **“Ocultar histórico”** (`aria-pressed`); sem `testid` novo só para teste.

## Validações automatizadas

- `vitest` ChatHeader.assignment + ChatHeader.status + inboxUi: **30 passed**
- E2E: passo de estado abre `Mais` antes do trigger

## Método de evidência visual

Código de produto **congelado** durante o gate. Comparação via harness estático:

- Harness: `docs/experiments/evidence/inbox-chat-header-density-gate/harness.html`
- Desktop: `1440 × 900` · Mobile: `390 × 844`
- Estados: unassigned+SLA+banner, assigned, CLOSED, Mais aberto, foco em Assumir / Encerrar

## Gate humano (pendente)

| # | Critério | Resultado |
|---|---|---|
| 1 | Leitura contato → estado → responsável → ação | _pendente_ |
| 2 | Sem repetição operacional relevante | _pendente_ |
| 3 | Header + banner sem pilha excessiva | _pendente_ |
| 4 | Assumir / Encerrar mouse + teclado | _pendente_ |
| 5 | Histórico com nome acessível | _pendente_ |
| 6 | Desktop / viewport estreito sem overflow | _pendente_ |
| 7 | Testes / CI verdes | Vitest local OK · CI na PR |
| 8 | Diff limitado à Fatia 2 | Sim |

## Decisão

**Pendente** — `KEEP` / `ITERATE` / `ROLLBACK` / `BLOCK` após evidência visual equivalente.
