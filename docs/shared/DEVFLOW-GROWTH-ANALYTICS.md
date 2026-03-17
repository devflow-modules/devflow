# Growth Analytics — Funil DevFlow End-to-End

Este documento descreve o sistema de **Growth Analytics** do DevFlow: funil de aquisição e ativação, eventos, métricas e como instrumentar novas páginas ou integrar com ferramentas externas (PostHog, Amplitude).

---

## 1. Definição do funil

Ordem típica da jornada do usuário:

1. **visitor_landed** — Visitante chegou na página (ex.: landing financeiro, divisão de contas).
2. **simulator_used** — Utilizou o simulador (alterou valores no simulador rápido ou em outra ferramenta).
3. **lead_submitted** — Enviou e-mail no formulário de captura de leads.
4. **signup_started** — Iniciou cadastro (clicou em sign up e enviou o formulário).
5. **signup_completed** — Concluiu cadastro (confirmou sessão no callback).
6. **household_created** — Criou a primeira casa (onboarding).
7. **first_expense_created** — Primeira despesa criada (ativação).
8. **first_income_created** — Primeira receita criada (ativação).
9. **first_rule_created** — Primeira regra de rateio criada (ativação).

---

## 2. Lista de eventos

Eventos definidos em `src/analytics/devflowFunnelEvents.ts`:

| Constante | Evento (string) |
|-----------|------------------|
| VISITOR_LANDED | devflow.funnel.visitor_landed |
| SIMULATOR_USED | devflow.funnel.simulator_used |
| LEAD_SUBMITTED | devflow.funnel.lead_submitted |
| SIGNUP_STARTED | devflow.funnel.signup_started |
| SIGNUP_COMPLETED | devflow.funnel.signup_completed |
| HOUSEHOLD_CREATED | devflow.funnel.household_created |
| FIRST_EXPENSE_CREATED | devflow.funnel.first_expense_created |
| FIRST_INCOME_CREATED | devflow.funnel.first_income_created |
| FIRST_RULE_CREATED | devflow.funnel.first_rule_created |

---

## 3. Métricas registradas

Todas em memória via `src/analytics/growth/growthMetrics.ts` (contadores `devflow.*`):

| Métrica | Quando é incrementada |
|---------|------------------------|
| devflow.visitors.count | trackVisitor (visitor_landed) |
| devflow.simulator.usage | trackSimulatorUsage |
| devflow.leads.submitted | trackLeadSubmission |
| devflow.signup.started | trackSignupStarted |
| devflow.signup.completed | trackSignupCompleted |
| devflow.households.created | trackHouseholdCreated |
| devflow.activation.expense | trackFirstExpenseCreated |
| devflow.activation.income | trackFirstIncomeCreated |
| devflow.activation.rule | trackFirstRuleCreated |

---

## 4. Camada de Growth Analytics

- **`src/analytics/growth/growthAnalytics.ts`** — Funções de track (trackVisitor, trackSimulatorUsage, trackLeadSubmission, trackSignupStarted, trackSignupCompleted, trackHouseholdCreated, trackFirstExpenseCreated, trackFirstIncomeCreated, trackFirstRuleCreated). Cada uma incrementa a métrica correspondente e loga em desenvolvimento.
- **`src/analytics/growth/growthFunnel.ts`** — `trackFunnelEvent(eventName, context)` mapeia o evento para a função de track.
- **`src/analytics/growth/growthMetrics.ts`** — Contadores em memória, `getCounters()`, `resetGrowthMetrics()` (para testes).
- **Contexto:** `{ sessionId?, userId?, householdId?, timestamp?, source? }`.

---

## 5. Instrumentação atual

- **Visitor landed:** Componente `<GrowthTrackVisitor />` nas páginas `/ferramentas/financeiro` e `/ferramentas/divisao-de-contas`; no mount dispara `visitor_landed` via API.
- **Simulator used:** No componente `SimuladorRapidoFinanceiro`, no primeiro `onChange` de qualquer input é chamado `trackSimulatorUsed()` (client → POST /api/analytics/growth).
- **Lead submitted:** No endpoint `POST /api/financeiro/leads`, após criar o lead, `trackLeadSubmission({ sessionId, source })`. O cliente envia `sessionId` opcional (getGrowthSessionId()).
- **Signup started:** Em `AuthFormClient`, ao submeter o formulário em modo signup, `trackSignupStartedClient()` (client → POST /api/analytics/growth).
- **Signup completed:** Na página de callback de auth, após obter sessão e `/api/me`, `trackSignupCompletedClient(userId)` (client → POST /api/analytics/growth).
- **Household / activation:** No módulo financeiro, quando ocorrem `trackFunnelFirst` para household_created, first_expense_created, first_income_created, first_rule_created, é chamada a função correspondente da growth layer (trackHouseholdCreated, trackFirstExpenseCreated, etc.).

---

## 6. API de track (client)

- **POST /api/analytics/growth** — Body: `{ event: DevflowFunnelEventName, sessionId?, userId?, householdId?, source? }`. Valida o evento e chama `trackFunnelEvent(event, context)`.
- **Cliente:** `src/analytics/growth/trackClient.ts` — `getGrowthSessionId()`, `trackGrowthEvent(event, options?)`, e helpers `trackVisitorLanded`, `trackSimulatorUsed`, `trackSignupStartedClient`, `trackSignupCompletedClient(userId?)`. O `sessionId` é gerado e armazenado em `sessionStorage` para a sessão do browser.

---

## 7. Como instrumentar novas páginas

1. **Landing nova:** Incluir `<GrowthTrackVisitor />` na página para disparar `visitor_landed` no carregamento.
2. **Ferramenta/simulador novo:** No primeiro uso (ex.: primeiro onChange ou primeiro clique), chamar `trackSimulatorUsed()` de `@/analytics/growth/trackClient` (ou enviar `devflow.funnel.simulator_used` via POST /api/analytics/growth).
3. **Novo formulário de lead:** Enviar no body o `sessionId` (getGrowthSessionId()) e, no backend, após persistir o lead, chamar `trackLeadSubmission` de `@/analytics/growth`.

Não alterar contratos públicos de API; usar campos opcionais (ex.: sessionId) quando necessário.

---

## 8. Integração com ferramentas externas (PostHog, Amplitude)

- **Hoje:** Log em desenvolvimento e contadores em memória; sem envio para provedor externo.
- **Para integrar:** Dentro de cada função em `growthAnalytics.ts` (ou em um único “dispatch” chamado por todas), invocar o cliente do provedor com o evento e o contexto (sessionId, userId, householdId, source, timestamp). Exemplo para PostHog:
  - `posthog.capture(eventName, { distinctId: userId ?? sessionId, ...context })`.
- Manter a chamada a `increment()` para as métricas internas; o envio ao provedor pode ser assíncrono (fire-and-forget ou fila).

---

## 9. Testes

- **`src/analytics/__tests__/growth/growthAnalytics.test.ts`** — Cada função de track incrementa a métrica esperada.
- **`src/analytics/__tests__/growth/growthFunnel.test.ts`** — `trackFunnelEvent` com cada evento dispara a função correta e incrementa o contador.

Uso de `resetGrowthMetrics()` entre testes para isolar estado.
