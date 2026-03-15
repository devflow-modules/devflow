# Camada de monetização — DevFlow

Este documento descreve a **infraestrutura de monetização** do produto: planos, limites, feature gating e preparação para gateway de pagamento. A camada é **opt-in e isolada**; não altera o comportamento atual para usuários FREE dentro dos limites.

---

## 1. Arquitetura de monetização

- **Planos:** FREE, PRO, TEAM (definidos em `src/modules/billing/plans.ts`).
- **BillingService:** obtém plano do usuário, valida limites e features (em memória; todos começam como FREE).
- **featureGuard:** retorna erro padronizado quando a feature não está disponível no plano.
- **Integração com financeiro:** checagens opcionais (soft) em rotas de criação de regras e de casas; marcadas com comentário `BILLING_SOFT_CHECK` para fácil remoção.
- **Páginas:** `/pricing` (comparação de planos) e `/upgrade` (plano atual + CTA de upgrade). Sem checkout real.
- **Eventos:** `billing.plan_viewed` e `billing.upgrade_clicked` registrados em growth metrics.

---

## 2. Definição de planos

| Plano | Casas | Regras | advancedRules | exports | analytics |
|-------|-------|--------|---------------|---------|-----------|
| FREE  | 1     | 3      | não           | não     | não       |
| PRO   | 5     | 50     | sim           | sim     | sim       |
| TEAM  | 20    | 500    | sim           | sim     | sim       |

Arquivo: `src/modules/billing/plans.ts`. Tipos: `PlanId`, `PlanDefinition`, `PlanFeatures`, `FeatureName`, `LimitType`.

---

## 3. BillingService

Métodos:

- **getUserPlan(userId)** — Retorna plano do usuário (default FREE).
- **setUserPlan(userId, planId)** — Define plano (memória; para testes ou futura persistência).
- **resetUserPlan(userId)** — Limpa plano (testes).
- **checkFeature(userId, featureName)** — Retorna `true` se o plano do usuário inclui a feature.
- **checkLimit(userId, limitType, currentCount)** — Retorna `true` se `currentCount < limite` do plano.
- **getLimit(userId, limitType)** — Retorna o limite numérico (households ou rules).

Hoje o plano é mantido em memória por processo; para produção é esperado persistir (tabela de assinaturas ou integração com gateway).

---

## 4. Feature gating

- **requireFeature(userId, featureName)** — Retorna `null` se o usuário tem acesso; caso contrário retorna `{ error: "feature_not_available", planRequired: "PRO" }`.
- Uso em rotas:  
  `const guard = requireFeature(userId, "analytics"); if (guard) return sendError(guard.error, 402, guard);`

Features gated: `advancedRules`, `exports`, `analytics`. Todas exigem PRO (ou superior).

---

## 5. Integração opcional com financeiro

- **POST /api/rules** — Antes de criar regra: conta regras do household; se `!BillingService.checkLimit(userId, "rules", count)` retorna 402 com código `RULE_LIMIT_REACHED`. Comentário: `BILLING_SOFT_CHECK`.
- **POST /api/households** — Antes de criar casa: conta households do usuário; se `!BillingService.checkLimit(userId, "households", count)` retorna 402 com código `HOUSEHOLD_LIMIT_REACHED`. Comentário: `BILLING_SOFT_CHECK`.

Para desativar: remover o bloco marcado com `BILLING_SOFT_CHECK` e o import de `BillingService` na rota.

---

## 6. Páginas de produto

- **/pricing** — Lista FREE, PRO e TEAM com limites e features; links “Começar grátis” (FREE) e “Fazer upgrade” (PRO/TEAM). Ao montar a página, dispara `trackPlanViewed()`.
- **/upgrade** — Mostra plano atual (FREE), benefícios do PRO e botão “Upgrade (em breve)”. Clique dispara `trackUpgradeClicked()`.

Sem integração com gateway de pagamento.

---

## 7. Eventos de monetização

- **billing.plan_viewed** — Disparado ao carregar `/pricing`. Incrementa `devflow.billing.plan_viewed` (growth metrics).
- **billing.upgrade_clicked** — Disparado ao clicar no CTA de upgrade em `/upgrade`. Incrementa `devflow.billing.upgrade_clicked`.

Implementação: `src/modules/billing/billingAnalytics.ts` (chama `increment` do growth metrics e log em dev).

---

## 8. Próximos passos (Stripe / Lemon / Paddle)

1. **Persistência de plano:** tabela `subscriptions` ou uso do gateway (customer + subscription); `getUserPlan` passar a ler de DB ou API do gateway.
2. **Checkout:** página ou fluxo que cria customer/subscription no gateway e, após pagamento confirmado, chama `BillingService.setUserPlan` ou atualiza a tabela que o BillingService lê.
3. **Webhooks:** endpoint que recebe eventos do gateway (pagamento aprovado, cancelamento, falha) e atualiza plano ou status da assinatura.
4. **Feature gating em rotas:** usar `requireFeature` nas rotas que expõem exports ou analytics avançado; retornar 402 com `planRequired` quando o plano for insuficiente.
5. **Dashboard admin:** listar assinaturas e planos (opcional); pode consumir a mesma fonte que o BillingService.

Nenhuma alteração de schema do banco nem de contratos de API existentes é necessária para manter o comportamento atual; a camada de monetização permanece opt-in e isolada.
