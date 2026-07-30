/**
 * Decisão F4 — navegação / taxonomia da home `/dashboard/ai`.
 *
 * Evidência de produto nesta fatia: F0–F3 já fixaram chrome (Prioridades, ≤2 quick
 * actions, health em details, KPIs essenciais). Não há sinal novo de utilizadores
 * ou telemetria a exigir mudança de `platformNav`, secção ou label nesta release.
 *
 * KEEP: manter `/dashboard/ai` sob Automação e IA (nav-config actual) sem alterar
 * platformNav / taxonomia global. Qualquer ajuste de nav fica para evidência futura
 * (fora de F4) ou F5 checklist — não antecipar.
 */

export const DASHBOARD_AI_NAV_TAXONOMY_DECISION = "KEEP" as const;

export const DASHBOARD_AI_NAV_TAXONOMY_SUMMARY =
  "KEEP taxonomia actual: /dashboard/ai permanece em Automação e IA; sem mudança a platformNav nesta F4.";
