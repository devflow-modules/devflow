# Experimento — frontend-design × Inbox empty state

Data: **2026-07-28**  
Branch: `experiment/frontend-design-whatsapp-inbox`  
Skill: `.cursor/skills/frontend-design/` (externa adaptada)

## Brief

| Campo | Valor |
|---|---|
| Assunto | Inbox WhatsApp Platform — estado vazio da lista |
| Público | Agentes de atendimento |
| Job único | Comunicar fila limpa vs filtro sem resultado e guiar de volta a «Precisa de resposta» |
| Escopo | Só `InboxFilterEmpty` + tokens CSS associados |
| Fora de escopo | Regras de negócio, APIs, filtros, composer, thread, SLA |

## Design plan

| Eixo | Escolha |
|---|---|
| Color | Tokens existentes `--df-brand-*`, `--df-feedback-success-text`, `--df-bg-*`, `--df-text-*` |
| Type | Eyebrow operacional + título 15px + corpo muted (`max-w-[28ch]`) |
| Layout | Card centrado full-bleed da lista; sem redesign do shell |
| Signature | **Trilho vertical de estado** (verde operacional vs brand no filtro) + eyebrow («Fila operacional» / «Filtro ativo») |

Evita defaults AI (cream/terracotta, acid-green on black, broadsheet). Ousadia concentrada no trilho.

## Before / after — métricas a recolher

| Métrica | Before | After | Notas |
|---|---|---|---|
| Tempo para voltar a «Precisa de resposta» (filtro vazio) | | | Cronometrar com agente |
| Erros / abandono do CTA | | | Clicks vs cancelamentos |
| Teclado (Tab → CTA → Enter) | | | Checklist manual |
| Mobile + desktop | | | Screenshot / review |
| Performance / CLS | | | Diff CSS leve; CLS esperado ~0 |
| Consistência com `df-*` | | | Review visual |
| Retrabalho / tempo de implementação | — | ~1 PR focado | |
| Percepção do agente | | | Qualitativo |

## Decisão (preencher após evidência)

`KEEP` | `ITERATE` | `ROLLBACK` | `BLOCK`

Critérios:

- **KEEP** — ganho comprovado; manutenção aceitável
- **ITERATE** — ganho parcial; ajustar skill/visual
- **ROLLBACK** — estética melhor, mas a11y/ops/manutenção pior
- **BLOCK** — faltam conteúdo real, identidade ou evidência

## Validações desta PR

- Business logic unchanged: **yes** (copy/CTA/testids/handlers intactos)
- Testes: `inboxUi.test.tsx` (empty + CTA + «Tudo em dia»)
- Screenshots: registrar no PR / checklist (`not run` se ambiente sem browser)
- `mcp-builder`: continua congelada
