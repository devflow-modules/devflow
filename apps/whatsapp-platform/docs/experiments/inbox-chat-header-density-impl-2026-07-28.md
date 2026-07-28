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
- Estados: unassigned+SLA+banner, assigned, CLOSED, Mais aberto, foco em Assumir

### Screenshots

| Arquivo | Conteúdo |
|---|---|
| `evidence/.../01-desktop-after-all.png` | After · 3 estados (desktop) |
| `evidence/.../02-desktop-before-all.png` | Before · mesma matriz |
| `evidence/.../03-mobile-after-all.png` | After · mobile 390×844 |
| `evidence/.../04-desktop-after-assume-focus.png` | Tab/foco em Assumir |
| `evidence/.../05-desktop-after-mais-open.png` | Mais aberto (overflow) |

## Gate — evidência agente (aguarda confirmação humana)

| # | Critério | Resultado |
|---|---|---|
| 1 | Leitura contato → estado → responsável → ação | **Sim** — hierarquia clara no after vs chips Before |
| 2 | Sem repetição operacional relevante | **Sim** — status OPEN/linha/fila/tags fora da faixa; Assumir ≠ “Responder agora” |
| 3 | Header + banner sem pilha excessiva | **Aceitável** — banner + header mais baixos que Before; residual banner fora de escopo |
| 4 | Assumir / Encerrar mouse + teclado | **Sim** — Zona B permanente; foco ring no harness (#04); testes assignment/status |
| 5 | Histórico com nome acessível | **Sim** — role/button “Histórico” / “Ocultar histórico” |
| 6 | Desktop / viewport estreito sem overflow | **Sim** — mobile wrap sem truncar CTAs principais |
| 7 | Testes / CI verdes | Vitest **30 passed** · CI na PR #164 |
| 8 | Diff limitado à Fatia 2 | **Sim** — ChatHeader + testes + e2e + docs/evidence |

## Decisão

**Recomendação agente: `KEEP`** — confirmação humana final ainda necessária (`KEEP` / `ITERATE` / `ROLLBACK` / `BLOCK`).
