# Botões — DevFlow Labs

Referência única para CTAs e ações. Implementação em `src/app/globals.css` e `apps/site/src/app/globals.css` (classes `df-btn-*`).

## Primary (`df-btn-primary`)

**Quando usar:** uma ação principal por bloco — demo guiada, agendar diagnóstico, conversa no WhatsApp como passo óbvio, ver produto quando é o único CTA forte.

**Visual:** `background: var(--primary)`, `color: var(--primary-foreground)`, borda transparente. Hover: `filter: brightness(1.1)` no CSS base.

**Regra de produto:** no máximo **um** primary por grupo de botões; dois verdes lado a lado quebram hierarquia e conversão.

## Secondary (`df-btn-secondary`)

**Quando usar:** alternativa com peso visual claro — “entender produto”, “ver mais”, navegação que não compete com o primary.

**Visual:** fundo transparente, borda `var(--devflow-border-brand)` no tema escuro.

**Em seção clara (`df-section-light`):** o CSS redefine borda para `var(--df-border-on-light)` e texto para `var(--df-text-on-light-primary)` para contraste em fundo claro. Preferir `df-btn-secondary` nesse contexto em vez de duplicar estilo manual.

## Secondary light (`df-btn-secondary-light`)

**Quando usar:** apenas legado ou layouts sem `df-section-light` onde ainda se precise do mesmo contraste de borda clara. Em páginas novas, prefira `df-btn-secondary` dentro de `df-section-light`.

## Ghost (`df-btn-ghost`)

**Quando usar:** ações de baixo peso, links discretos que ainda precisam parecer clicáveis.

**Visual:** texto em `var(--df-text-secondary-current)` (fallback `muted-foreground`). Hover: `color: var(--primary)` + sublinhado — affordance explícita.

## Disabled (`df-btn-disabled`)

**Quando usar:** estado indisponível ou feature futura.

**Visual:** `opacity: 0.5`, `cursor: not-allowed`, `pointer-events: none`, `user-select: none` no **botão inteiro** (não só no texto).

## Tamanho e ícones

- Altura mínima: **40px** (`min-height` nas classes base).
- `padding`, `font-weight: 500`, `border-radius: 0.75rem`, `gap: 0.5rem` entre ícone e label.
- Ícones: preferir `size-4` / `1.125em` alinhados ao texto do CTA.

## Foco (acessibilidade)

`focus-visible`: anel via `box-shadow` com `color-mix` do `primary` (ver regras `.df-btn-*:focus-visible` no CSS).

## Regras que não negociamos

1. Sempre `df-btn-*` para ações — evitar `bg-white` / `text-slate-*` soltos em botões.
2. Um primary por bloco decisório.
3. Em cards claros dentro de fluxo claro, respeitar tokens de seção (`df-section-light`).
4. Contraste alvo **WCAG AA**; se algo “sumir”, ajustar tokens, não opacidade só no texto.

## Mapa mental (funil)

Topo → demo ganha. Meio → contexto (secondary / links). Fundo → diagnóstico ou WhatsApp, sem competir com outro primary no mesmo grupo.
