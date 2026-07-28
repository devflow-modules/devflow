---
name: frontend-design
description: >-
  Guides distinctive product-grounded visual design for new or reshaped UI while
  preserving DevFlow design systems. Use for aesthetic direction, typography and
  signature composition; BLOCK when brief, real content or product identity is
  insufficient.
---

# Frontend design (DevFlow adaptation)

## Objetivo

Definir e aplicar uma **direção visual intencional** (assunto, público, job da página, tokens, tipografia, assinatura memorável) sem cair em templates genéricos de UI gerada por IA — **preservando** design system, identidade e contratos do produto. Capacidade: `action-enabled`.

Derivada de Anthropic `frontend-design` (Apache 2.0). Snapshot e auditoria: [`.cursor/external-skills/quarantine/frontend-design/`](../../external-skills/quarantine/frontend-design/AUDIT.md). Atribuição: [`NOTICE.md`](./NOTICE.md).

## Gatilhos de uso

- Nova landing, hero ou superfície promocional que precise de identidade autoral.
- Reshape visual de tela existente **com escopo aprovado**.
- Produtos/portfólio (ex. Na Braza, WhatsApp Platform, FlexCargo) quando o pedido for direção criativa, não só polish pontual.

Não usar para: polish mínimo sem mudança de direção → [`nextjs-ui-polish`](../nextjs-ui-polish/SKILL.md); priorização comercial → [`revenue-centric-design`](../revenue-centric-design/SKILL.md); validação pré-build → [`product-grill`](../product-grill/SKILL.md); alterar regras de negócio, auth, APIs ou routing.

## Entradas obrigatórias

- Brief: assunto concreto, público e **job único** da página/tela.
- Conteúdo real do produto (copy, dados, estados). Conteúdo fictício **proibido** quando dados reais forem necessários.
- Identidade / design system do app (`packages/ui`, tokens, regras de design do produto).
- Escopo aprovado (o que pode mudar visualmente; o que é intocável).
- Viewports alvo (desktop + mobile no mínimo).
- [`AGENTS.md`](../../../AGENTS.md); [Next.js rule](../../rules/03-nextjs-app-router.mdc) quando App Router.
- WhatsApp Platform: [design rule](../../rules/whatsapp-platform-design.mdc) e [`DESIGN_SYSTEM.md`](../../../apps/whatsapp-platform/docs/DESIGN_SYSTEM.md).

Brief, conteúdo ou identidade insuficientes → `BLOCK`.

## Fluxo operacional

1. **Grounding** — Nomear assunto, audiência e job único; usar o mundo do produto (materiais, artefactos, vernáculo), não um template genérico.
2. **Plano de design (antes do código)** — Compacto:
   - Color: 4–6 tokens nomeados (hex) alinhados ao sistema existente ou extensão autorizada.
   - Type: display (com contenção) + body + utility se necessário; preferir fontes já no projeto; externas só com licença e autorização.
   - Layout: conceito em prosa e/ou wireframe markdown (ASCII opcional, não obrigatório).
   - Signature: **um** elemento memorável justificado pelo brief.
3. **Critique** — Rejeitar defaults de UI-IA (ex. cream+#terracotta; near-black+acid-green; broadsheet hairline) salvo pedido explícito do brief. Concentrar ousadia na signature; resto disciplinado.
4. **Build** — Implementar só o escopo aprovado; reutilizar componentes/tokens existentes; stack do projeto; CSS sem seletor war que anule paddings/margins.
5. **Estados e escrita** — Cobrir loading, empty, error, disabled, success. Copy: voz do produto, voz ativa, erros acionáveis, empty como convite a agir — não filler.
6. **Quality floor** — Mobile; foco de teclado visível; `prefers-reduced-motion`; contraste/WCAG; HTML semântico; orçamento de performance e prevenção de CLS.
7. **Evidence** — Screenshots desktop + mobile quando o ambiente permitir; checklist se screenshot indisponível (`not run` + motivo).

## Guardrails

- Preservar design system e identidade existentes; não criar paleta/sombra ad hoc que quebre o sistema.
- Não substituir UI funcional nem fluxos críticos sem escopo aprovado.
- Não alterar regras de negócio, contratos HTTP, middleware, auth ou analytics.
- Não inventar conteúdo de produto; não usar PII real em fixtures.
- Fontes externas: só licenciadas + autorizadas; default = stack tipográfica do repo.
- Um risco estético justificado; cortar decoração que não sirva o brief.
- Motion: orquestrado e subordinado ao assunto; respeitar redução de movimento.
- Relacionar polish técnico residual a [`nextjs-ui-polish`](../nextjs-ui-polish/SKILL.md).

## Stop conditions

Parar com `BLOCK` / escalar humano quando:

- brief, assunto, público ou job da página estiverem ambíguos;
- conteúdo real necessário estiver ausente e for pedido inventar;
- identidade/design system do produto for insuficiente ou conflitar com o pedido;
- escopo exigir reescrever UI funcional / contratos sem aprovação;
- fonte ou asset externo não tiver licença/autorização;
- a11y e direção visual forem irreconciliáveis sem decisão humana;
- for pedido copiar literalmente a skill upstream sem guardrails DevFlow.

## Validações

- Plano de design revisto antes do código (`pass` | `blocked`).
- Tokens/componentes: reutilizados vs novos justificados.
- Estados loading/empty/error/disabled/success cobertos ou `not applicable`.
- A11y: teclado, foco, contraste, reduced-motion — `pass` | `fail` | `not run`.
- Performance/CLS: nota ou `not run`.
- Screenshots desktop + mobile: `pass` | `not run` (+ motivo).
- Sem mudança de regra de negócio / API.
- Classificar cada item: `pass` | `fail` | `blocked` | `not run`.

## Formato da entrega

```text
Subject / audience / page job:
Design plan (color | type | layout | signature):
What changed vs default AI looks:
Design system / tokens reused:
States covered:
Accessibility:
Performance / CLS:
Screenshots: desktop | mobile | not run
Business logic unchanged: yes | no
Blocked / not run:
Decision: ship | iterate | BLOCK
```
