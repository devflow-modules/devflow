# Sprint 12 — Stripe Customer Portal / Billing Self-Service

**Status:** Concluída  
**Data:** Março 2026  
**Testes:** 136 passando (+15 novos)  
**Build:** Limpo

---

## Resumo

Integração do Stripe Customer Portal ao DevFlow, permitindo que assinantes gerenciem sua assinatura de forma autônoma (cancelamento, upgrade/downgrade, histórico, método de pagamento) sem que o produto precise construir essas interfaces.

---

## Arquivos Novos

| Arquivo | Descrição |
|---|---|
| `src/modules/billing/adapters/payment/StripeCustomerPortalAdapter.ts` | Adapter que cria sessões do Stripe Billing Portal |
| `src/modules/billing/BillingProfileRepository.ts` | CRUD da tabela `UserBillingProfile` |
| `src/modules/billing/BillingPortalService.ts` | Serviço: `openCustomerPortal`, `getCurrentSubscriptionSummary` |
| `src/app/api/billing/customer-portal/route.ts` | `POST /api/billing/customer-portal` |
| `src/app/billing/page.tsx` | Página central de assinatura do usuário |
| `src/app/billing/ManageSubscriptionButton.tsx` | Botão client para abrir o portal |
| `prisma/migrations/20260316163437_add_user_billing_profile/migration.sql` | Migração da tabela |
| `docs/DEVFLOW-CUSTOMER-PORTAL.md` | Documentação completa |

---

## Arquivos Alterados

| Arquivo | O que mudou |
|---|---|
| `prisma/schema.prisma` | + model `UserBillingProfile`, relation em `User` |
| `src/modules/billing/adapters/payment/types.ts` | + `stripeCustomerId` em `WebhookParsedEvent`, + `CustomerPortalAdapter` |
| `src/modules/billing/adapters/payment/StripeAdapter.ts` | `parseWebhookEvent` agora expõe `stripeCustomerId` |
| `apps/financeiro/.../api/billing/webhook/route.ts` | (pós-cutover) webhook canónico no app Financeiro |
| `src/modules/billing/billingAnalytics.ts` | + 4 novos eventos de billing self-service |
| `src/app/upgrade/page.tsx` | CTA "Já é assinante? Gerencie sua assinatura" |
| `src/app/pricing/page.tsx` | CTA "Já é assinante? Gerencie sua assinatura" |
| `.env.example` | + `NEXT_PUBLIC_APP_URL` documentado |

---

## Rotas Novas

| Rota | Método | Descrição |
|---|---|---|
| `/billing` | GET | Página de assinatura do usuário |
| `/api/billing/customer-portal` | POST | Cria sessão do Customer Portal |

---

## Testes Adicionados (15 novos)

| Arquivo | Testes |
|---|---|
| `BillingProfileRepository.test.ts` | 6 (getByUserId, upsertProfile, updateSubscriptionId, clearSubscriptionId) |
| `StripeCustomerPortalAdapter.test.ts` | 2 (createCustomerPortalSession, erro Stripe) |
| `customer-portal/route.test.ts` | 6 (autenticação, sucesso, erros de profile, erro interno) |
| `webhook/route.test.ts` | atualizado — 1 novo test (persiste profile, não chama sem customerId) |

---

## Decisões Arquiteturais

1. **Separação de responsabilidades:** `UserPlan` continua como fonte de verdade do plano. `UserBillingProfile` é exclusivo para integração com Stripe.

2. **Interface `CustomerPortalAdapter`:** Desacopla a implementação Stripe do serviço. Trocar por Lemon Squeezy, Paddle ou outro gateway requer apenas um novo adapter — sem tocar em `BillingPortalService`.

3. **`BillingPortalService`** centraliza a lógica para que a rota não tenha acoplamento direto com repositórios.

4. **Webhook incrementado:** A mesma rota de webhook que já tratava planos agora também persiste IDs do Stripe, sem alterar o fluxo de atualização do plano.

5. **`NEXT_PUBLIC_APP_URL`:** Usado para construir `returnUrl` do portal e `successUrl` do checkout, garantindo redirecionamento correto em todos os ambientes.

---

## Eventos de Analytics Novos

| Evento | Gatilho |
|---|---|
| `billing.subscription_manage_clicked` | Clique em "Gerenciar assinatura" |
| `billing.customer_portal_opened` | Sessão do portal criada com sucesso |
| `billing.subscription_cancelled_portal` | Webhook `customer.subscription.deleted` |
| `billing.subscription_updated_portal` | Webhook `customer.subscription.updated` |

---

## Configuração Necessária (Stripe Dashboard)

Antes de usar o Customer Portal em produção:

1. Acessar **Billing → Customer Portal** no Stripe Dashboard
2. Ativar opções de cancelamento, upgrade/downgrade, update de pagamento
3. Configurar os preços disponíveis
4. Salvar a configuração

---

## Próximos Passos Possíveis

- **Sprint 13:** Exibir plano real do usuário na página `/billing` (via Server Component + BillingService)
- **Sprint 14:** Email transacional pós-pagamento (confirmação de upgrade)
- **Sprint 15:** Trial period (período grátis antes de cobrar)
- **Sprint 16:** Invoice download na página `/billing`
