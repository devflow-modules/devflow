# Narrativa comercial de planos (produto)

Este documento alinha **o que comunicamos** sobre planos e valor percebido. Não substitui `modules/billing/plans.ts`, que continua a ser a fonte de verdade para **limites numéricos**, **flags** e **enforcement**.

## Camadas

| Camada | Conteúdo |
|--------|----------|
| **Técnica** | `plans.ts`, capabilities, `enforceUsageOrThrow`, agregados de uso, Stripe |
| **Espelho tipado para UI** | `planUiCapabilities.ts` — `getUiPlanCapabilities()` (flags e limites, sem duplicar regras) |
| **Apresentação (UI)** | `planPresentation.ts` — copy alinhada às flags em `plans.ts` |
| **Matriz de verificação** | `CAPABILITIES_MATRIX.md` — tabela flags vs copy |
| **Documentação de fluxo** | `BILLING_FLOW.md` — como o billing funciona no sistema |

A UI de billing (`/billing`, `/dashboard/billing`, `/settings/billing`) deve **vender resultado operacional** (Inbox, equipa, filas, IA, gestão, escala). Os números de quota aparecem como **contexto** ou em secções de consumo, não como único argumento de venda.

## Posicionamento por plano (resumo)

Os títulos e subtítulos comerciais vivem em `planPresentation.ts` (`COMMERCIAL_PLAN_HEADLINE`, `COMMERCIAL_PLAN_SUBTITLE`). Benefícios em bullets: `COMMERCIAL_PLAN_BENEFITS`. CTAs de checkout: `COMMERCIAL_CHECKOUT_CTA`.

- **FREE** — Testar a plataforma (entrada).
- **STARTER** — Começar a operar com organização.
- **PRO** — Operar com equipe, IA e controle (plano recomendado na UI).
- **SCALE** — Escalar atendimento com mais volume e automação.

## Matriz de valor

A tabela em `/dashboard/billing` usa `PLAN_VALUE_COMPARISON` (eixos Operação, IA, Gestão, Escala). Os limites numéricos aparecem no rodapé da tabela via `formatIncludedLimitsLine`, em texto secundário.

Alterar esta narrativa implica atualizar `planPresentation.ts` e, se necessário, rever consistência com as flags em `plans.ts` (sem alterar enforcement sem intenção).
