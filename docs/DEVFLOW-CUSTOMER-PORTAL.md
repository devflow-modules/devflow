# Customer Portal — DevFlow (Sprint 12)

Documentação da integração do Stripe Customer Portal para self-service de assinatura.

---

## 1. Visão Geral

O Customer Portal é uma página hospedada pelo Stripe que permite ao usuário:

- Cancelar a assinatura
- Fazer upgrade ou downgrade de plano
- Visualizar histórico de pagamentos e faturas
- Atualizar o método de pagamento

O DevFlow não precisa construir essas interfaces — o Stripe as fornece via portal. O sistema apenas cria uma sessão de portal e redireciona o usuário.

---

## 2. Arquitetura

```
Usuário
  │
  ▼
POST /api/billing/customer-portal
  │
  ├── requireSessionOnly (auth)
  ├── BillingPortalService.openCustomerPortal(userId, returnUrl)
  │     ├── BillingProfileRepository.getByUserId(userId)
  │     └── StripeCustomerPortalAdapter.createCustomerPortalSession(stripeCustomerId, returnUrl)
  └── retorna { portalUrl }
  │
  ▼
window.location.href = portalUrl  →  Stripe Billing Portal  →  returnUrl (/billing)
```

---

## 3. Relação entre UserPlan e UserBillingProfile

| Tabela | Responsabilidade |
|---|---|
| `UserPlan` | Fonte de verdade do plano atual (FREE, PRO, TEAM) |
| `UserBillingProfile` | Armazena IDs do Stripe para integração com Customer Portal |

**UserPlan** é atualizado pelo webhook Stripe (`checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`).

**UserBillingProfile** é criado/atualizado pelo mesmo webhook ao receber `stripeCustomerId` e `stripeSubscriptionId`. Não substitui UserPlan.

---

## 4. Fluxo Completo

### 4.1 Checkout (novo assinante)

```
1. Usuário clica em "Fazer upgrade"
2. POST /api/billing/checkout → Stripe Checkout Session
3. Stripe redireciona para checkout.stripe.com
4. Usuário paga → Stripe dispara checkout.session.completed
5. Webhook → BillingService.setUserPlan(userId, planId)
6. Webhook → BillingProfileRepository.upsertProfile(userId, stripeCustomerId, subscriptionId)
7. Usuário retorna para /billing?success=1
```

### 4.2 Customer Portal (assinante existente)

```
1. Usuário clica em "Gerenciar assinatura"
2. POST /api/billing/customer-portal
3. BillingProfileRepository.getByUserId → obtém stripeCustomerId
4. StripeCustomerPortalAdapter.createCustomerPortalSession(stripeCustomerId, returnUrl)
5. Stripe retorna portalUrl → window.location.href = portalUrl
6. Usuário gerencia no portal do Stripe
7. Stripe dispara webhooks ao realizar alterações:
   - customer.subscription.updated → atualiza UserPlan + UserBillingProfile
   - customer.subscription.deleted → UserPlan = FREE, clearSubscriptionId
8. Usuário retorna para /billing (returnUrl)
```

### 4.3 Cancelamento via portal

```
1. Usuário cancela no portal Stripe
2. Stripe dispara customer.subscription.deleted
3. Webhook → BillingService.setUserPlan(userId, "FREE")
4. Webhook → BillingProfileRepository.clearSubscriptionId(userId)
5. Analytics: trackSubscriptionCancelled + trackSubscriptionCancelledPortal
```

---

## 5. Estrutura de Arquivos

```
src/modules/billing/
├── adapters/payment/
│   ├── types.ts                          # CustomerPortalAdapter types
│   └── StripeCustomerPortalAdapter.ts    # Implementação Stripe
├── BillingProfileRepository.ts           # CRUD UserBillingProfile
├── BillingPortalService.ts               # Lógica: openCustomerPortal, getCurrentSubscriptionSummary
└── billingAnalytics.ts                   # Eventos: portal_opened, manage_clicked, etc.

src/app/
├── api/billing/
│   └── customer-portal/route.ts          # POST endpoint
└── billing/
    ├── page.tsx                          # Página de assinatura
    └── ManageSubscriptionButton.tsx      # Botão client para abrir portal

prisma/
└── schema.prisma                         # + model UserBillingProfile
```

---

## 6. Erros Esperados

| Código | Status HTTP | Causa |
|---|---|---|
| `BILLING_PROFILE_NOT_FOUND` | 404 | Usuário não fez checkout ainda |
| `STRIPE_CUSTOMER_NOT_FOUND` | 404 | Perfil existe mas sem stripeCustomerId |
| `INTERNAL_ERROR` | 500 | Erro na API Stripe |

Quando o usuário não tem perfil de billing, o frontend deve orientá-lo a fazer o checkout primeiro.

---

## 7. Eventos de Analytics

| Evento | Quando é disparado |
|---|---|
| `billing.subscription_manage_clicked` | Ao clicar em "Gerenciar assinatura" |
| `billing.customer_portal_opened` | Quando sessão do portal é criada com sucesso |
| `billing.subscription_cancelled_portal` | Webhook `customer.subscription.deleted` |
| `billing.subscription_updated_portal` | Webhook `customer.subscription.updated` via portal |

---

## 8. Configuração

### Stripe Dashboard

O Customer Portal precisa ser configurado no Stripe Dashboard:

1. Acesse **Billing → Customer Portal** no Stripe Dashboard
2. Ative as opções: cancelamento, upgrade/downgrade, update de método de pagamento
3. Configure os produtos/preços disponíveis para upgrade/downgrade
4. Salve a configuração (necessário antes de usar o portal)

### Variáveis de Ambiente

```env
STRIPE_SECRET_KEY=sk_live_xxx        # ou STRIPE_TEST_SECRET_KEY em dev
NEXT_PUBLIC_APP_URL=https://devflow.com.br  # usada para returnUrl
```

---

## 9. Como Trocar o Gateway no Futuro

O `StripeCustomerPortalAdapter` implementa a interface `CustomerPortalAdapter` de `types.ts`:

```typescript
export type CustomerPortalAdapter = {
  createCustomerPortalSession(params: CreateCustomerPortalParams): Promise<CreateCustomerPortalResult>;
};
```

Para trocar por outro gateway (Lemon Squeezy, Paddle, etc.):

1. Criar `LemonCustomerPortalAdapter.ts` implementando `CustomerPortalAdapter`
2. Substituir o import em `BillingPortalService.ts`
3. Nenhuma outra mudança necessária

---

## 10. Referências

- [DEVFLOW-PAYMENTS.md](./DEVFLOW-PAYMENTS.md) — Checkout + Webhooks (Sprint 10)
- [DEVFLOW-BILLING.md](./DEVFLOW-BILLING.md) — Monetization Layer (Sprint 9)
- `src/modules/billing/BillingPortalService.ts`
- `prisma/schema.prisma` — model `UserBillingProfile`
