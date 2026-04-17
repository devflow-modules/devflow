# Contratos de API (SAAS vs WHITE_LABEL)

Este documento resume **diferenças de payload** quando `NEXT_PUBLIC_PRODUCT_MODE=WHITE_LABEL` e o utilizador autenticado **não** tem acesso completo a billing (tipicamente manager/operator). A implementação vive em `src/modules/billing/billingSanitizer.ts` e nas rotas que a invocam.

## Convenções

- **SAAS + qualquer role**: respostas completas (sujeitas a regras de negócio já existentes).
- **WHITE_LABEL + utilizador sanitizado**: campos comerciais (plano, preços, IDs Stripe, contagens detalhadas de uso monetizado) são removidos ou substituídos por mensagens neutras.
- **WHITE_LABEL + platform_admin (ou admin onde aplicável)**: respostas completas para operação.

## Endpoints relevantes (não exaustivo)

| Área | Método / rota | Comportamento WL (tenant normal) |
|------|----------------|----------------------------------|
| Tenant | `GET /api/tenants/me` | Remove `plan`, `activeUntil` do JSON. |
| Billing | `GET /api/billing/subscription` | Só estado mínimo (`status`, `cancelAtPeriodEnd`) ou equivalente sanitizado. |
| Billing | `GET /api/billing/usage` | Dashboard sem contagens/preços sensíveis; mantém sinais operacionais (`withinLimits`, etc.). |
| Billing | `GET /api/billing/ui` | Objeto vazio `{}` para UI comercial quando sanitizado. |
| Billing | `GET /api/billing/ai-plan` | Objeto vazio quando sanitizado. |
| Billing | `GET /api/billing/ai-usage-status` | `can_use`, `should_fallback_to_legacy`, `period` — sem limites numéricos/plano. |
| AI | `GET /api/ai/usage` | Métricas sem tokens/custo quando sanitizado. |
| Erros | `402` / limites | Mensagem genérica “contacte suporte”; sem `currentPlan` / upgrade no JSON sanitizado. |
| Erros | `403` FEATURE_NOT_AVAILABLE | Sem nomes de plano nem “upgrade” no payload sanitizado. |
| Escritas | Checkout, portal, upgrades Stripe | `403` com mensagem de produto quando WL e não autorizado (`billingWriteForbiddenResponse`). |

## Tipos TypeScript

Para referência estática e testes, ver `src/types/whiteLabelContracts.ts` e os tipos `Sanitized*` em `billingSanitizer.ts`.

## Erros e códigos HTTP

As rotas devem continuar a usar o padrão da app (`sendSuccess` / `sendError` onde existir) e **não** vazar dados sensíveis em `details` aninhados — `sanitizeBillingData` existe para legado genérico; preferir funções tipadas por rota.

## Testes

Cenários WL estão cobertos em `src/**/__tests__/` (ex.: `billingSanitizer.test.ts`, `tenants/me`, rotas de billing e AI).
