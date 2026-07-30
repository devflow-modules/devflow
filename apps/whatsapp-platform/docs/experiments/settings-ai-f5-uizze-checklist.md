# Settings AI F5 — checklist UIZZE (informativo)

**Superfície:** `/settings/ai` (IA base do WhatsApp)  
**Modo:** informativo — **não** bloqueia merge; sem Action GitHub bloqueante.  
**Referência:** experimento UIZZE Inbox #169 (hold); esta checklist adapta o espírito ao settings-ai pós F0–F4.  
**Data:** 2026-07-30 · branch `test/settings-ai-f5-final-validation`

## Tarefa central do utilizador

Configurar a IA base do workspace: activar, definir comportamento, testar resposta, salvar.

## Cobertura

| Item | Desktop | Mobile | Notas |
| --- | --- | --- | --- |
| 1ª dobra: título curto + toggle IA + Salvar prioritário | PASS | PASS | F1 |
| ≤2 quick links secundários | PASS | PASS | F1 |
| Sem cartão IA por canal / IaCrossLinks / ordem sugerida | PASS | PASS | F1 |
| Sem badge Modo; Guardrails colapsado | PASS | PASS | F2 |
| ≤1 faixa comercial no caminho principal | PASS | PASS | F2 |
| Playbook colapsado (10 campos fora do caminho) | PASS | PASS | F3 |
| Copy workspace (sem «neste canal») | PASS | PASS | F3 |
| Labels Salvar unificados; sem «Quando usar:» | PASS | PASS | F4; mobile: Salvar do form sempre; header pode colapsar |
| CTA Testar: normal / foco / loading / retorno | PASS | PASS | F0 |
| Feedback erro ou sucesso após teste (se API) | PASS* | PASS* | *condicional |
| Teclado: foco em Salvar rodapé | PASS | PASS | Tab/focus |
| Âncoras «Ir para» presentes | PASS | PASS | nav interna |

## Achados UIZZE (informativo)

| Sev. | Achado | Evidência | FP? | Decisão |
| --- | --- | --- | --- | --- |
| — | Nenhum redesenho proposto nesta F5 | Smoke Playwright F5 | — | KEEP série |

## Decisão consolidada da série `/settings/ai`

| Fatia | PR | Decisão |
| --- | --- | --- |
| F0 CTA | #182 | KEEP |
| F1 chrome | #184 | KEEP |
| F2 status/billing | #186 | KEEP |
| F3 playbook/copy | #188 | KEEP |
| F4 FieldHelp/Salvar | #190 | KEEP |
| F5 validação | (este PR) | VALIDAR → KEEP checklist |

**UIZZE #169** permanece em hold (Inbox); não bloqueia o fecho desta série settings-ai.
