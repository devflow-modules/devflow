# Relatório final — Sprint 7 — Growth Analytics End-to-End

**Objetivo:** Expandir o sistema de analytics para **Growth Analytics completo**, cobrindo a jornada do usuário da aquisição até a ativação no produto.

**Restrições respeitadas:** Nenhuma alteração em schema do banco, contratos de API, URLs ou comportamento visual. Apenas adição opcional de `sessionId` no body de `POST /api/financeiro/leads`. Build e testes passando.

---

## 1. Funil completo definido (FASE 1)

- **`src/analytics/devflowFunnelEvents.ts`** — Constantes e tipo dos eventos do funil:
  - devflow.funnel.visitor_landed
  - devflow.funnel.simulator_used
  - devflow.funnel.lead_submitted
  - devflow.funnel.signup_started
  - devflow.funnel.signup_completed
  - devflow.funnel.household_created
  - devflow.funnel.first_expense_created
  - devflow.funnel.first_income_created
  - devflow.funnel.first_rule_created

---

## 2. Camada de Growth Analytics (FASE 2)

- **`src/analytics/growth/growthAnalytics.ts`** — Funções: trackVisitor, trackSimulatorUsage, trackLeadSubmission, trackSignupStarted, trackSignupCompleted, trackHouseholdCreated, trackFirstExpenseCreated, trackFirstIncomeCreated, trackFirstRuleCreated. Cada uma incrementa a métrica correspondente e loga em desenvolvimento.
- **`src/analytics/growth/growthFunnel.ts`** — trackFunnelEvent(eventName, context) mapeia evento → função de track.
- **`src/analytics/growth/growthMetrics.ts`** — Contadores em memória (devflow.*), getCounters(), resetGrowthMetrics().
- **`src/analytics/growth/trackClient.ts`** — Cliente para uso no browser: getGrowthSessionId(), trackGrowthEvent(), trackVisitorLanded(), trackSimulatorUsed(), trackSignupStartedClient(), trackSignupCompletedClient(userId). SessionId em sessionStorage.
- **`src/analytics/growth/index.ts`** — Barrel export.

---

## 3. Instrumentação do simulador (FASE 3)

- **Landing financeiro** (`/ferramentas/financeiro`): componente `<GrowthTrackVisitor />` no mount dispara visitor_landed.
- **SimuladorRapidoFinanceiro:** no primeiro onChange de qualquer input (receita, fixas, variáveis) chama trackSimulatorUsed() (client → POST /api/analytics/growth).
- **Divisão de contas** (`/ferramentas/divisao-de-contas`): `<GrowthTrackVisitor />` para visitor_landed.

---

## 4. Captura de leads (FASE 4)

- **POST /api/financeiro/leads:** após createLead(), chama trackLeadSubmission({ sessionId, source }). Métrica: devflow.leads.submitted.
- **LeadCaptureForm:** envia no body sessionId opcional (getGrowthSessionId()) para correlacionar com a sessão do visitante.
- **Schema:** adicionado campo opcional `sessionId` em financeiroLeadCreateSchema (sem quebrar contrato).

---

## 5. Signup (FASE 5)

- **Signup started:** Em AuthFormClient, ao submeter em modo signup, chama trackSignupStartedClient() (client → POST /api/analytics/growth). Métrica: devflow.signup.started.
- **Signup completed:** Na página de callback de auth, após obter sessão e resposta de /api/me, chama trackSignupCompletedClient(userId). Métrica: devflow.signup.completed.

---

## 6. Ponte funil financeiro → funil global (FASE 6)

Quando o módulo financeiro emite eventos de funil (primeira ocorrência em memória), também registra no funil global:

- **createHousehold:** trackHouseholdCreated({ userId, householdId }) (sempre que casa é criada).
- **createExpense:** se trackFunnelFirst("finance.funnel.first_expense_created") retorna true → trackFirstExpenseCreated(context).
- **createIncome:** se trackFunnelFirst("finance.funnel.first_income_created") retorna true → trackFirstIncomeCreated(context).
- **createRule:** se trackFunnelFirst("finance.funnel.first_rule_created") retorna true → trackFirstRuleCreated(context).

Métricas: devflow.households.created, devflow.activation.expense, devflow.activation.income, devflow.activation.rule.

---

## 7. Métricas de funil (FASE 7)

Todas registradas em growthMetrics (contadores devflow.*):

- devflow.visitors.count
- devflow.simulator.usage
- devflow.leads.submitted
- devflow.signup.started
- devflow.signup.completed
- devflow.households.created
- devflow.activation.expense
- devflow.activation.income
- devflow.activation.rule

---

## 8. API de track

- **POST /api/analytics/growth** — Body: { event, sessionId?, userId?, householdId?, source? }. Valida evento (whitelist) e chama trackFunnelEvent. Retorna { success: true } ou 400/500.

---

## 9. Testes (FASE 8)

- **`src/analytics/__tests__/growth/growthAnalytics.test.ts`** — Cada função de track (trackVisitor, trackSimulatorUsage, trackLeadSubmission, trackSignupStarted, trackSignupCompleted, trackHouseholdCreated, trackFirstExpenseCreated, trackFirstIncomeCreated, trackFirstRuleCreated) incrementa a métrica esperada.
- **`src/analytics/__tests__/growth/growthFunnel.test.ts`** — trackFunnelEvent com visitor_landed, lead_submitted, signup_started, signup_completed, household_created incrementa os contadores corretos.

Uso de resetGrowthMetrics() entre testes. **Total: 21 arquivos de teste, 67 testes passando.**

---

## 10. Documentação (FASE 9)

- **`docs/DEVFLOW-GROWTH-ANALYTICS.md`** — Definição do funil, lista de eventos, métricas, instrumentação atual, API de track, como instrumentar novas páginas e integrar com PostHog/Amplitude.

---

## 11. Build e testes

- **Build:** `pnpm run build` — concluído com sucesso (rota /api/analytics/growth incluída).
- **Testes:** `pnpm test` — 21 arquivos, 67 testes passando.

---

## 12. Resumo dos entregáveis

| # | Entregável | Status |
|---|------------|--------|
| 1 | Sistema de growth analytics implementado | Concluído |
| 2 | Eventos de funil definidos (devflowFunnelEvents.ts) | Concluído |
| 3 | Simulador e landings instrumentados | Concluído |
| 4 | Captura de leads instrumentada | Concluído |
| 5 | Signup instrumentado (started + completed) | Concluído |
| 6 | Métricas de funil registradas | Concluído |
| 7 | Testes de growth analytics adicionados | Concluído |
| 8 | Documento DEVFLOW-GROWTH-ANALYTICS.md | Concluído |
| 9 | Build executado com sucesso | Concluído |
| 10 | Relatório final da Sprint 7 | Este documento |

---

**Sprint 7 concluída.** O DevFlow passou a contar com Growth Analytics end-to-end: funil definido, camada de track (server + client), métricas em memória, instrumentação em landing, simulador, leads, signup e ponte com o funil do módulo financeiro (household e ativação).
