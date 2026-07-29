# Implementação — Fatia 5 · Banner de ação e registro de resultado

Data: **2026-07-29**  
Branch: `experiment/inbox-banner-dealclose-phase5`  
Base: `main` @ `9a1cdc51`  
Auditoria: [inbox-banner-dealclose-phase5-audit-2026-07-29.md](./inbox-banner-dealclose-phase5-audit-2026-07-29.md)  
Proposta: [inbox-banner-dealclose-phase5-visual-proposal-2026-07-29.md](./inbox-banner-dealclose-phase5-visual-proposal-2026-07-29.md)

## Gates aplicados (PROCEED humano)

| Gate | Valor |
|---|---|
| UI | **B** — urgência e resultado progressivos |
| P5 | **B** — omitir `customer_waiting`; manter HIGH + `negotiation_stalled` |
| P1 | **A** — DealClose montado na posição actual; densificar |
| P6 | Não |
| D5-R1 | **B** — ocultar forms se `CLOSED` e deal aberto |
| D5-R2 / R3 | Preservar |

## Diff de produto

| Ficheiro | Mudança |
|---|---|
| `conversationActionBannerLogic.ts` | Remove variante `customer_waiting` (P5-B) |
| `ConversationActionBanner.tsx` | Faixa compacta; emoji `aria-hidden` |
| `DealClosePanel.tsx` | Densidade rail/`details`; D5-R1 early return se CLOSED |
| `__tests__/conversationActionBannerLogic.test.ts` | P5-B + CLOSED |
| `__tests__/guidedInboxComponents.test.tsx` | Banner omitido sem HIGH |
| `__tests__/DealClosePanel.test.tsx` | **Novo** — ramos UI + D5-R1 |
| `tests/e2e/inbox-mobile-revenue.spec.ts` | Selectors “Registrar resultado…” / “Fechou venda” |

Sem alteração a contratos HTTP, roles, Encerrar, timeline, composer, KEEP 1–4, ChatWindow, Fatia 6.

## Validações executadas

```text
vitest:
  conversationActionBannerLogic.test.ts  4 passed
  guidedInboxComponents.test.tsx         4 passed
  DealClosePanel.test.tsx                9 passed
Total: 17 passed
```

E2E `inbox-mobile-revenue.spec.ts`: selectors alinhados ao DOM actual (execução com credenciais E2E fica para CI/local autenticado).

## Evidência visual

`docs/experiments/evidence/inbox-banner-dealclose-phase5-gate/`

| Arquivo | Conteúdo |
|---|---|
| `harness.html` | Before/after + cenas |
| `01-after-waiting-no-banner.png` | P5-B: sem banner em awaiting sem HIGH |
| `02-before-waiting-banner.png` | Before: banner customer_waiting |
| `03-after-high-compact.png` | HIGH compacto |
| `04-after-deal-details.png` | Deal details aberto |
| `05-after-pending.png` | Pending manager |
| `06-after-won.png` | Won compacto |
| `07-after-closed-r1.png` | D5-R1: CLOSED sem forms |
| `08-mobile-after-waiting.png` | Mobile 390 P5-B |

Script de captura: `scripts/e2e/capture-phase5-gate.mjs`.

## Gate humano

| Critério | Resultado |
|---|---|
| P5-B omit customer_waiting | **Sim** (código + testes) |
| HIGH + stalled preservados | **Sim** |
| P1-A posição DealClose | **Sim** (ChatWindow intacto) |
| Densidade details/rail | **Sim** |
| D5-R1 CLOSED | **Sim** (teste UI) |
| Roles/HTTP intactos | **Sim** |
| Vitest DealClose UI | **9 passed** |
| E2E selectors alinhados | **Sim** (diff) |

## Decisão pedida

| Decisão | Significado |
|---|---|
| **KEEP** | Aceitar; merge/PR quando autorizado |
| **ITERATE** | Ajustar densidade/copy/gates |
| **ROLLBACK** | Reverter branch |
| **BLOCK** | Parar |

Commit / push / PR: **não executados** nesta etapa (aguardam instrução).
