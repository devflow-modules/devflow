# Modo de produto (SAAS vs WHITE_LABEL)

O comportamento comercial da interface e dos contratos HTTP públicos é controlado por uma variável de ambiente de build/runtime:

- **`NEXT_PUBLIC_PRODUCT_MODE`**: valores `SAAS` ou `WHITE_LABEL`. Por defeito: `SAAS` (quando omitida).

**SAAS**: experiência self-service com Stripe (checkout no signup onde aplicável, portal, rotas de faturação visíveis, cópias de upgrade).

**WHITE_LABEL**: a UI e as respostas de API para utilizadores normais (manager, operator) não expõem plano comercial, preços, subscrição Stripe nem metering sensível. A lógica de servidor (Stripe, webhooks, limites internos) mantém-se para operações e staff.

## Onde é lido

- **Cliente**: `src/lib/productMode.ts` — `isWhiteLabelMode()`, `PRODUCT_MODE`.
- **API (sanitização)**: `src/modules/billing/billingSanitizer.ts` — `isWhiteLabelBillingApi()`, `shouldSanitizeBillingResponse()`.
- **Navegação / rotas**: middleware e configuração de nav (por exemplo ocultar `/dashboard/billing` em WL para não-admin).

## Regras rápidas

1. Nunca confiar apenas na UI para esconder dados: rotas `/api/billing/*`, `/api/tenants/me`, `/api/ai/usage`, etc. aplicam sanitização quando `WHITE_LABEL` e o utilizador não é `platform_admin` nem `admin` (conforme rota).
2. Staff (`platform_admin` / `admin` consoante política) pode receber payloads completos para operação e suporte.
3. Alterar o modo implica rebuild do Next.js (`NEXT_PUBLIC_*` é embutido no bundle).

## Documentação relacionada

- [WHITE_LABEL_STRATEGY.md](./WHITE_LABEL_STRATEGY.md)
- [API_CONTRACT.md](./API_CONTRACT.md)
- [ops/ENVIRONMENT.md](./ops/ENVIRONMENT.md)
