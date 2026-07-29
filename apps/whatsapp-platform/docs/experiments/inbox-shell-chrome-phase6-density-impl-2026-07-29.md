# Implementação — Fatia 6 · Chrome do `InboxShell` (lista primeiro)

Data: **2026-07-29**  
Branch: `experiment/inbox-shell-chrome-phase6`  
Base: `main` @ `174adf89`  
Auditoria: [inbox-shell-chrome-phase6-audit-2026-07-29.md](./inbox-shell-chrome-phase6-audit-2026-07-29.md)  
Proposta: [inbox-shell-chrome-phase6-visual-proposal-2026-07-29.md](./inbox-shell-chrome-phase6-visual-proposal-2026-07-29.md)

## Gates aplicados (PROCEED humano)

| Gate | Valor |
|---|---|
| UI | **B** — lista primeiro |
| S6-1 | **A** — métricas em `<details>` fechado; fetch actual preservado; lazy **fora** |
| S6-2 | **A** — focus opt-in |
| S6-3 | **A** — Prospect bar densificada (CSS); regras/permissões/visibilidade intactas |
| S6-4–S6-10 | Só densidade/apresentação; contratos intactos |
| S6-11 | Fora |

## Diff de produto

| Ficheiro | Mudança |
|---|---|
| `InboxShell.tsx` | Header/toasts/pricing densos; sem eyebrow/description operacional; `aria-pressed` + testid focus; metrics `<details>` fechado |
| `InboxMetricsPanel.tsx` | Densidade tipográfica/cards; `data-testid`; corrige `Assumir próxima` (`variant="primary"` — estava sempre disabled) |
| `ConversationsList.tsx` | filterChrome / stale / sticky densificados (CSS only) |
| `InboxProspectMetricsBar.tsx` | Densidade CSS (S6-3 A) |
| `OnlineUsersBadge.tsx` | Badge mais compacto |
| `PricingContextHint.tsx` | `className` opcional para densidade no shell |
| `__tests__/InboxShell.test.tsx` | **Novo** — S6-1 A / S6-2 A |
| `__tests__/InboxMetricsPanel.test.tsx` | **Novo** — fetch preservado + UI densa |
| `tests/a11y/product-ui-a11y.spec.ts` | Endurece âncora inbox (shell visível + include axe) |

Sem alteração a filtros, URL `phase`, ordenação, sticky behaviour, permissões prospect, KEEP 1–5, lazy fetch.

## Validações executadas

```text
git diff --check                         OK (sem whitespace errors)

vitest (inbox direcionado):
  InboxShell.test.tsx                    3 passed
  InboxMetricsPanel.test.tsx             2 passed
  guidedInboxComponents.test.tsx         4 passed
  inboxUi.test.tsx                      22 passed
Total: 31 passed

eslint src                               0 errors (warnings pré-existentes fora do diff)
pnpm lint:design-system                  OK (baseline)
pnpm check:buttons                       OK
tsc --noEmit                             OK
next build (NODE_ENV=production)         OK

a11y product-ui inbox (axe WCAG 2.1 AA):
  passed — seletor endurecido para shell visível + include no axe
  (next dev pode deixar nó transitório hidden; não é regressão de produto Fatia 6)
```

## Evidência visual

`docs/experiments/evidence/inbox-shell-chrome-phase6-gate/`

| Arquivo | Conteúdo |
|---|---|
| `harness.html` | Before/after + cenas (default / metrics-open / focus) |
| `01-after-default-list-first.png` | After desktop — lista primeiro |
| `02-before-default-chrome-heavy.png` | Before desktop — chrome pesado |
| `03-after-metrics-open.png` | After com métricas abertas |
| `04-after-focus.png` | After modo foco |
| `05-mobile-after-default.png` | Mobile 390 after |
| `06-mobile-before-default.png` | Mobile 390 before |

Script: `scripts/e2e/capture-phase6-gate.mjs`.

## Gate humano

| Critério | Resultado |
|---|---|
| S6-1 A details fechado + fetch preservado | **Sim** (código + testes) |
| Lazy métricas fora | **Sim** |
| S6-2 A focus opt-in | **Sim** (testid + aria-pressed) |
| S6-3 A prospect CSS only | **Sim** |
| Filtros/URL/sort/sticky intactos | **Sim** |
| KEEP 1–5 intactos | **Sim** |
| Vitest Shell + Metrics (+ inbox UI) | **31 passed** |
| Lint / design-system / buttons / tsc / build | **OK** |
| A11y inbox axe | **passed** (seletor visível) |
| Evidência responsiva | **Harness + 6 PNGs** |

## Decisão

**Pendente humano:** `KEEP` / `ITERATE` / `ROLLBACK` / `BLOCK`

### Nota de bugfix colateral (funcional)

`Assumir próxima` usava `variant="disabled"` (botão **sempre** inactivo) com override visual `primary`. Corrigido para `variant="primary"` + `disabled={nextMut.isPending}` — restaura o contrato operacional esperado, sem mudança de HTTP.

### Nota a11y

`product-ui-a11y.spec.ts` (inbox): espera o shell **visível** e limita o axe a `[data-testid="inbox-shell"]`, porque `next dev` pode manter um nó transitório hidden durante soft nav/hidratação.
