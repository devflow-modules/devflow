# Implementação — Fatia 4 · Painel de contexto do cliente

Data: **2026-07-28**  
Branch: `experiment/inbox-context-panel-density`  
Auditoria: [inbox-context-panel-phase4-audit-2026-07-28.md](./inbox-context-panel-phase4-audit-2026-07-28.md)  
Proposta: [inbox-context-panel-phase4-visual-proposal-2026-07-28.md](./inbox-context-panel-phase4-visual-proposal-2026-07-28.md)

## Diff de produto

| Ficheiro | Mudança |
|---|---|
| `LeadDataPanel.tsx` | Resumo glance-first; Situação compacta; labels sugestões ≠ Playbook; `tabpanel` |
| `__tests__/LeadDataPanel.test.tsx` | Glance order, 4 tabs, C4 dup score, Prospect gate admin/operator/FREE |

Sem alteração a handlers, APIs, permissões, DealClose, header, lista ou composer.

## Anatomia Resumo (B)

1. Prioridade + score (`lead-score`, `lead-score-bar`)  
2. Situação compacta (estado · fase · responsável)  
3. evaluationMode (se FREE), após o glance  

## C1–C8 (conservador)

Duplicata score na CRM mantida (C4); 4 tabs; Situação; sugestões ambas; Prospect gated; focus mobile CRM inalterado (fora deste diff).

## Validações

- `vitest` `LeadDataPanel.test.tsx`: **8 passed**

## Evidência

`docs/experiments/evidence/inbox-context-panel-density-gate/harness.html`

| Arquivo | Conteúdo |
|---|---|
| `01-xl-after-resumo.png` | After · glance-first |
| `02-xl-before-resumo.png` | Before · Situação antes do score |
| `03-xl-after-crm-admin.png` | CRM + Prospect admin |
| `04-drawer-after-resumo.png` | Drawer |
| `05-stack-after-resumo.png` | Stack mobile |
| `06-focus-mobile-no-crm.png` | Focus mobile sem CRM (C5) |

## Gate humano (pendente)

KEEP / ITERATE / ROLLBACK / BLOCK após revisão da evidência.
