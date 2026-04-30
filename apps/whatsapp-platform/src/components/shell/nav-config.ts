import type { UserRole } from "@/modules/auth";
import { ROUTE_META } from "@/lib/navigation/nav-matrix";
import { isOperator, isPlatformAdmin, isTenantManager } from "@/lib/roles";
import { isCommercialBillingVisible } from "@/lib/productMode";
import {
  canAccessDeveloperSettings,
  canViewAutomation,
  canViewTeamPage,
} from "@/lib/permissions";

export type NavItem = { href: string; label: string; description?: string };

function navItem(href: string): NavItem {
  const m = ROUTE_META[href];
  return {
    href,
    label: m?.label ?? href,
    description: m?.searchAliases?.[0],
  };
}

/** 1. Operação — painel, inbox, histórico, filas */
export function navOperationItemsForRole(role: UserRole | string | null): NavItem[] {
  const items = [
    navItem("/dashboard"),
    navItem("/inbox"),
    navItem("/conversations"),
    navItem("/queues"),
  ];
  if (!role) return items;
  if (isOperator(role) && !isPlatformAdmin(role)) {
    return items.filter((i) => i.href !== "/dashboard");
  }
  return items;
}

/** 2. Automação e IA */
export function navAutomationItemsForRole(role: UserRole | string | null): NavItem[] {
  if (role && !canViewAutomation(role)) return [];
  const items = [
    navItem("/automation"),
    navItem("/dashboard/ai"),
    navItem("/settings/ai"),
    navItem("/settings/ai-analytics"),
  ];
  if (!role) return items;
  if (isOperator(role) && !isPlatformAdmin(role)) {
    return items.filter((i) => i.href === "/automation");
  }
  return items;
}

/** 3. Conta — WhatsApp, faturação, configurações, integrações */
export function navAccountItemsForRole(role: UserRole | string | null): NavItem[] {
  if (!role) {
    const out: NavItem[] = [navItem("/dashboard/whatsapp")];
    if (isCommercialBillingVisible()) out.push(navItem("/billing"));
    out.push(navItem("/settings"));
    return out;
  }
  if (isOperator(role) && !isPlatformAdmin(role)) return [];

  const out: NavItem[] = [navItem("/dashboard/whatsapp")];
  if (isCommercialBillingVisible()) {
    out.push(navItem("/billing"));
  }
  out.push(navItem("/settings"));
  if (canAccessDeveloperSettings(role)) {
    out.push(navItem("/settings/developer"));
  }
  return out;
}

/** 4. Equipe — agentes */
export function navTeamItemsForRole(role: UserRole | string | null): NavItem[] {
  if (role && !canViewTeamPage(role)) return [];
  return [navItem("/agents")];
}

/** Compat: lista «principal» antiga (dashboard, inbox, histórico, automações — sem filas). */
export const NAV_PRIMARY: NavItem[] = [
  navItem("/dashboard"),
  navItem("/inbox"),
  navItem("/conversations"),
  navItem("/automation"),
];

/** Compat: secção Conta (sem entradas de IA — passaram para Automação e IA). */
export const NAV_SECONDARY: NavItem[] = navAccountItemsForRole(null);

/** Compat: agentes + filas (estrutura antiga). */
export const NAV_OPERATION: NavItem[] = [navItem("/agents"), navItem("/queues")];

const OPERATOR_PRIMARY_HREFS = new Set<string>(["/inbox", "/conversations", "/automation"]);

export function primaryNavForRole(role: UserRole | string | null): NavItem[] {
  if (!role) return NAV_PRIMARY;
  if (isPlatformAdmin(role) || isTenantManager(role)) return NAV_PRIMARY;
  if (isOperator(role)) {
    return NAV_PRIMARY.filter((i) => OPERATOR_PRIMARY_HREFS.has(i.href));
  }
  return NAV_PRIMARY;
}

export function secondaryNavForRole(role: UserRole | string | null): NavItem[] {
  return navAccountItemsForRole(role);
}

export const NAV_ADMIN = { href: "/admin/metrics", label: "Métricas internas" };
