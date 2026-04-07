# WhatsApp Platform — validação de billing

Objetivo: garantir que **Stripe + UI de planos** no `whatsapp-platform` estão coerentes e **não dependem do portal** para o fluxo pago.

## Superfícies principais

| Área | Onde |
|------|------|
| Checkout | API `POST /api/stripe/checkout` (sessão Stripe) |
| Customer portal | `POST /api/stripe/portal` (requer `requireRole` admin onde aplicável) |
| Upgrade / checkout billing | Rotas em `src/app/api/billing/*` (`checkout`, `portal`, `upgrade`, …) |
| Webhook Stripe | `POST /api/stripe/webhook` — **mesmo host** que o app (não o portal) |
| Uso / limites IA | `GET /api/billing/ai-usage-status`, `GET /api/billing/usage`, etc. |

## Variáveis (produção)

Ver `apps/whatsapp-platform/README.md` e `.env.production.example` na raiz (template do app): `WHATSAPP_STRIPE_*`, `NEXT_PUBLIC_WHATSAPP_APP_URL`.

## Critérios de aceite (homologação)

- Página de billing/planos abre autenticado.
- Checkout abre URL Stripe.
- Customer portal abre quando o tenant tem `customerId`.
- Em falha de rede/API, mensagens de erro são legíveis e a UI não quebra de forma silenciosa.
- Plano exibido alinha com Stripe / DB conforme implementação atual.

## Testes automatizados (baseline)

Exemplos em `apps/whatsapp-platform`:

- `src/app/api/stripe/checkout/__tests__/route.test.ts`
- `src/modules/stripe/__tests__/stripeWebhook.test.ts`
- Módulos em `src/modules/billing/__tests__/`

## Smoke manual

Executar no host de produção do app: upgrade/downgrade/cancel conforme o que estiver exposto na UI atual.
