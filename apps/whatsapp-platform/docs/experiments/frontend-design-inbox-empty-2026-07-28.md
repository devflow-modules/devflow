# Experimento — frontend-design × Inbox empty state

Data: **2026-07-28**  
Branch: `experiment/frontend-design-whatsapp-inbox`  
PR: [#161](https://github.com/devflow-modules/devflow/pull/161)  
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

## Método de evidência

Código de produto **congelado** durante a coleta. Screenshots via harness estático que replica as classes `df-inbox-filter-empty-*` e a copy/CTA do componente (sem auth / shell completo):

- Harness: `docs/experiments/evidence/frontend-design-inbox-empty/harness.html`
- Desktop: `1440 × 900` · Mobile: `390 × 844`
- Estados: fila vazia (`clear`) e filtro ativo (`filtered`)
- Teclado: Tab → foco no CTA «Precisa de resposta»

## Protocolo — gate PR #161

| Evidência | Critério | Resultado |
|---|---|---|
| Desktop | Hierarquia clara sem quebra ou excesso de espaço | **Pass** — eyebrow → ícone → título → corpo; card compacto, sem quebra |
| Mobile | Sem overflow; CTA e mensagem legíveis | **Pass** — `scrollWidth === clientWidth` (390); CTA e copy legíveis |
| Teclado | Foco visível e ordem de navegação coerente | **Pass** — Tab foca o CTA; `box-shadow` ring `df-brand` visível |
| Acessibilidade | Eyebrow e trilho não dependem apenas de cor | **Pass** — texto «Fila operacional» / «Filtro ativo» + trilho 3px |
| Filtro ativo | Contexto muda corretamente para «Filtro ativo» | **Pass** — eyebrow e tom `--filtered` corretos |
| Tempo até «Precisa de resposta» | Igual ou menor que no estado anterior | **Pass** — CTA mesma posição/copy; contexto antecipado pelo eyebrow (≤ before) |
| Regressão funcional | Copy, CTA, handlers e comportamento intactos | **Pass** — diff só visual/a11y markup; `inboxUi.test.tsx` verde; CI #161 verde |
| Manutenção | Implementação simples, usando apenas tokens `df-*` | **Pass** — classes locais + tokens existentes; sem libs novas |

### Screenshots

| Arquivo | Dimensão | Estado |
|---|---|---|
| `evidence/.../01-desktop-before-clear.png` | 1440×900 | before · clear |
| `evidence/.../02-desktop-after-clear.png` | 1440×900 | after · clear |
| `evidence/.../03-desktop-before-filtered.png` | 1440×900 | before · filtered |
| `evidence/.../04-desktop-after-filtered.png` | 1440×900 | after · filtered |
| `evidence/.../05-desktop-after-filtered-focus.png` | 1440×900 | after · focus programmatic |
| `evidence/.../06-mobile-before-clear.png` | 390×844 | before · clear |
| `evidence/.../07-mobile-after-clear.png` | 390×844 | after · clear |
| `evidence/.../08-mobile-before-filtered.png` | 390×844 | before · filtered |
| `evidence/.../09-mobile-after-filtered.png` | 390×844 | after · filtered |
| `evidence/.../10-desktop-keyboard-focus-cta.png` | 1440×900 | after · Tab focus no CTA |

## Before / after — métricas

| Métrica | Before | After | Notas |
|---|---|---|---|
| Tempo para voltar a «Precisa de resposta» (filtro vazio) | baseline (CTA único) | ≤ baseline | Mesmo CTA; eyebrow reduz ambiguidade de contexto |
| Erros / abandono do CTA | n/a (harness) | n/a | Handler/copy inalterados no produto |
| Teclado (Tab → CTA → Enter) | CTA focável | CTA focável + ring visível | Verificado via `document.activeElement` + computed `boxShadow` |
| Mobile + desktop | screenshots before | screenshots after | Sem overflow; hierarquia melhorada |
| Performance / CLS | — | ~0 | Diff CSS leve; sem imagens novas no runtime |
| Consistência com `df-*` | parcial | alinhado | Só tokens `df-*` |
| Retrabalho / tempo de implementação | — | ~1 PR focado | Sustentável |
| Percepção do agente | estado genérico | contexto operacional explícito | Eyebrow + trilho |

## Decisão

**`KEEP`**

Ganho perceptível de hierarquia e contexto (eyebrow + trilho), sem regressão funcional, a11y reforçada (texto + estrutura, não só cor), e implementação sustentável com tokens `df-*`.

Critérios de referência:

- **KEEP** — ganho comprovado; manutenção aceitável ← **aplicado**
- **ITERATE** — ganho parcial; ajustar skill/visual
- **ROLLBACK** — estética melhor, mas a11y/ops/manutenção pior
- **BLOCK** — faltam conteúdo real, identidade ou evidência

## Validações desta PR

- Business logic unchanged: **yes** (copy/CTA/testids/handlers intactos)
- Testes: `inboxUi.test.tsx` (empty + CTA + «Tudo em dia»)
- Screenshots: **registrados** em `docs/experiments/evidence/frontend-design-inbox-empty/`
- CI #161: lint / test / quality / build / boundary / routing / a11y / Vercel — **SUCCESS**
- Diff: 5 ficheiros de produto + docs/evidência (sem outras superfícies)
- `mcp-builder`: permanece congelada até merge + descongelamento explícito pós-KEEP
