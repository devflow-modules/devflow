/**
 * Eventos do funil de aquisição e ativação DevFlow.
 * Ordem típica: visitor_landed -> simulator_used -> lead_submitted -> signup_started -> signup_completed -> household_created -> first_*_created
 */

export const DEVFLOW_FUNNEL_EVENTS = {
  VISITOR_LANDED: "devflow.funnel.visitor_landed",
  SIMULATOR_USED: "devflow.funnel.simulator_used",
  LEAD_SUBMITTED: "devflow.funnel.lead_submitted",
  SIGNUP_STARTED: "devflow.funnel.signup_started",
  SIGNUP_COMPLETED: "devflow.funnel.signup_completed",
  HOUSEHOLD_CREATED: "devflow.funnel.household_created",
  FIRST_EXPENSE_CREATED: "devflow.funnel.first_expense_created",
  FIRST_INCOME_CREATED: "devflow.funnel.first_income_created",
  FIRST_RULE_CREATED: "devflow.funnel.first_rule_created",
} as const;

export type DevflowFunnelEventName =
  (typeof DEVFLOW_FUNNEL_EVENTS)[keyof typeof DEVFLOW_FUNNEL_EVENTS];
