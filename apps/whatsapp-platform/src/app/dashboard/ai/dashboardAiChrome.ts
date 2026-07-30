/**
 * Chrome da home `/dashboard/ai` (dashboard-ai F1).
 * Quick links ≤2; sem Inbox (ações recomendadas já levam ao inbox filtrado).
 */

export const DASHBOARD_AI_TITLE = "Prioridades";
export const DASHBOARD_AI_DESCRIPTION =
  "O que precisa de atenção agora. Canal e controlos ficam nos detalhes abaixo.";

export const DASHBOARD_AI_HEADER_QUICK_LINKS = [
  { href: "/settings/ai", label: "IA base" },
  { href: "/settings/ai-analytics", label: "Uso da IA" },
] as const;

export const DASHBOARD_AI_MAX_HEADER_QUICK_LINKS = 2;

export const DASHBOARD_AI_HEALTH_DETAILS_SUMMARY = "Canal e controlos operacionais";
