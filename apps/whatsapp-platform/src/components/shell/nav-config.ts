import type { UserRole } from "@/modules/auth";
import { ROUTE_META } from "@/lib/navigation/nav-matrix";
import { isOperator, isPlatformAdmin, isTenantManager } from "@/lib/roles";

export type NavItem = { href: string; label: string; description?: string };

/** Navegação principal — frequência de uso (máx. 6). Labels alinhados à matriz de produto. */
export const NAV_PRIMARY: NavItem[] = [
  { href: "/dashboard", label: ROUTE_META["/dashboard"].label, description: "Resumo e próximos passos" },
  { href: "/inbox", label: ROUTE_META["/inbox"].label, description: "Atendimento, histórico e filas" },
  { href: "/automation", label: ROUTE_META["/automation"].label, description: "Regras e automação" },
];

/**
 * Secundária — conta, canais, cobrança e configuração.
 * Ordem IA (utilizador): Configurações (motor) → IA de atendimento (comportamento) → Análises de IA (uso/custo);
 * «IA — operação» no painel é métricas operacionais, não o mesmo ecrã que /settings/ai.
 */
export const NAV_SECONDARY: NavItem[] = [
  { href: "/dashboard/whatsapp", label: ROUTE_META["/dashboard/whatsapp"].label, description: "Estado da ligação Meta" },
  { href: "/dashboard/ai", label: ROUTE_META["/dashboard/ai"].label, description: "Métricas e guardas da IA" },
  { href: "/billing", label: ROUTE_META["/billing"].label, description: "Plano e faturação" },
  { href: "/settings", label: ROUTE_META["/settings"].label, description: "Conta e preferências" },
  { href: "/settings/ai", label: ROUTE_META["/settings/ai"].label, description: "Prompt, tom e automação da IA no WhatsApp" },
  { href: "/settings/ai-analytics", label: ROUTE_META["/settings/ai-analytics"].label, description: "Uso de IA e custos" },
  { href: "/settings/developer", label: ROUTE_META["/settings/developer"].label, description: "Chave de API" },
];

/** Operação — equipa e filas. */
export const NAV_OPERATION: NavItem[] = [
  { href: "/agents", label: ROUTE_META["/agents"].label },
  { href: "/queues", label: ROUTE_META["/queues"].label },
];

export const NAV_ADMIN = { href: "/admin/metrics", label: "Métricas internas" };

const OPERATOR_PRIMARY_HREFS = new Set<string>(["/inbox", "/automation"]);

/** Navegação principal conforme role (operador não vê painel/análises). */
export function primaryNavForRole(role: UserRole | string | null): NavItem[] {
  if (!role) return NAV_PRIMARY;
  if (isPlatformAdmin(role) || isTenantManager(role)) return NAV_PRIMARY;
  if (isOperator(role)) {
    return NAV_PRIMARY.filter((i) => OPERATOR_PRIMARY_HREFS.has(i.href));
  }
  return NAV_PRIMARY;
}

/** Secundária: operador não vê conta/cobrança; API developer só para gestor do tenant. */
export function secondaryNavForRole(role: UserRole | string | null): NavItem[] {
  if (!role) return NAV_SECONDARY;
  if (isOperator(role) && !isPlatformAdmin(role)) return [];
  return NAV_SECONDARY.filter((item) => {
    if (item.href === "/settings/developer") return isTenantManager(role) || isPlatformAdmin(role);
    return true;
  });
}
