# Implementação — Fatia 3 · Composer e assistências

Data: **2026-07-28**  
Branch: `experiment/inbox-composer-assistances-density`  
Auditoria: [inbox-composer-assistances-phase3-audit-2026-07-28.md](./inbox-composer-assistances-phase3-audit-2026-07-28.md)  
Proposta: [inbox-composer-assistances-phase3-visual-proposal-2026-07-28.md](./inbox-composer-assistances-phase3-visual-proposal-2026-07-28.md)

## Diff de produto

| Ficheiro | Mudança |
|---|---|
| `MessageInput.tsx` | Composer-first; toolbar Templates/IA/Playbook; mutex; sem 4 CTAs mobile |
| `ChatWindow.tsx` | “Responder agora” foca `#inbox-composer` |
| `__tests__/inboxUi.test.tsx` | Abertura via toolbar + teste mutex |

Sem alteração a handlers HTTP, prompts, DealClose roles, lista, header ou CRM.

## Anatomia

1. STATE: lock · typing · follow-up compacto · erro/retry  
2. PRIMARY: textarea + Enviar  
3. Toolbar: Templates | IA | Playbook (`role="toolbar"`)  
4. Região única (`role="region"`, max-height) — uma assistência  

DealClose: posição inalterada (P1); já em `<details>` no fluxo padrão.

## P1–P8

Comportamento atual preservado (sem persistência de rascunho, sem novo “Enviar direto”, etc.).

## Validações

- `vitest` `inboxUi.test.tsx`: **22 passed** (incl. mutex)

## Evidência

Harness: `docs/experiments/evidence/inbox-composer-assistances-gate/harness.html`

| Arquivo | Conteúdo |
|---|---|
| `01-desktop-after.png` | After · assistências fechadas |
| `02-desktop-before.png` | Before · pilha details + CTAs |
| `03-desktop-after-ai.png` | After · região IA aberta |
| `04-mobile-after.png` | After · mobile sem 4 CTAs |

## Gate humano (pendente)

Critérios 1–10 da decisão PROCEED — aguarda KEEP / ITERATE / ROLLBACK / BLOCK.

**Recomendação agente:** `KEEP` provisória após Vitest 22/22 e hierarquia after vs before no harness — confirmação humana final.
