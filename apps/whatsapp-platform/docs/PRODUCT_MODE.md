# Modo de produto (SAAS, WHITE_LABEL, IMPLEMENTATION)

O comportamento comercial da interface e dos contratos HTTP públicos é controlado por uma variável de ambiente de build/runtime:

- **`NEXT_PUBLIC_PRODUCT_MODE`**: valores `SAAS`, `WHITE_LABEL` ou `IMPLEMENTATION`.
- **Default seguro**: `IMPLEMENTATION` (quando omitida ou inválida).

**SAAS**: experiência self-service com Stripe (checkout no signup onde aplicável, portal, rotas de faturação visíveis, cópias de upgrade).

**WHITE_LABEL / IMPLEMENTATION**: modo operacional com lockdown comercial. A UI e as respostas de API para utilizadores normais (manager, operator) não expõem plano comercial, preços, subscrição Stripe nem metering sensível. A lógica interna de servidor (Stripe, webhooks, limites internos) mantém-se para operações DevFlow e staff.

## Onde é lido

- **Cliente**: `src/lib/productMode.ts` — `PRODUCT_MODE`, `isWhiteLabelMode()`, `isImplementationMode()`, `isSaasMode()`, `isCommercialBillingVisible()`.
- **API (sanitização)**: `src/modules/billing/billingSanitizer.ts` — `isWhiteLabelBillingApi()`, `shouldSanitizeBillingResponse()`.
- **Navegação / rotas**: middleware e configuração de nav (por exemplo ocultar `/dashboard/billing` em WL para não-admin).

## Regras rápidas

1. Nunca confiar apenas na UI para esconder dados: rotas `/api/billing/*`, `/api/stripe/*`, `/api/tenants/me`, `/api/ai/usage` e payloads de erro aplicam sanitização/bloqueio quando o modo **não** é `SAAS`.
2. Staff (`platform_admin` / `admin` consoante política) pode receber payloads completos para operação e suporte.
3. Alterar o modo implica rebuild do Next.js (`NEXT_PUBLIC_*` é embutido no bundle).

## Lockdown de rotas em implementation/white-label

- Bloqueadas para utilizador comum: `/billing`, `/dashboard/billing`, `/settings/billing`, `/plan`, `/subscription`.
- Comportamento: redirect para `/dashboard`.
- `/admin/billing` mantém-se como ferramenta interna e exige `platform_admin` (ou bypass interno de métricas em produção).

## Documentação relacionada

- [WHITE_LABEL_STRATEGY.md](./WHITE_LABEL_STRATEGY.md)
- [API_CONTRACT.md](./API_CONTRACT.md)
- [ops/ENVIRONMENT.md](./ops/ENVIRONMENT.md)
