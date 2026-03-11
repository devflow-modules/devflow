# DevFlow Labs — Design System

Identidade visual da DevFlow Labs. Estética: Vercel + Supabase + Linear.

## Estrutura

- `colors.ts` — Paleta de cores da marca
- `spacing.ts` — Espaçamento, container, breakpoints
- `typography.ts` — Fontes, pesos, tamanhos
- `components.ts` — Especificações de botões, cards, badges
- `index.ts` — Barrel export

## Uso

```ts
import { colors, spacing, typography, components } from "@/design-system";
```

## Tokens CSS

Os tokens CSS ficam em `src/styles/tokens.css` e são importados em `globals.css`.

## Paleta

| Token | Hex | Uso |
|-------|-----|-----|
| primary | #22c55e | Botões, CTA, links, ícones |
| primaryDark | #16a34a | Hover do primary |
| accent | #38bdf8 | Elementos técnicos, gráficos |
| backgroundAlt | #f1f5f9 | Seções alternadas |
