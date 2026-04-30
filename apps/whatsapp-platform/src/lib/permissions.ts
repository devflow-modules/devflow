import type { UserRole } from "@/modules/auth";
import type { ProductMode } from "@/lib/productMode";
import { isCommercialBillingVisible } from "@/lib/productMode";
import {
  isOperator as isOperatorRole,
  isPlatformAdmin as isPlatformAdminRole,
  isTenantManager as isTenantManagerRole,
} from "@/lib/roles";

export type PermissionRole = UserRole;

function resolveCommercialVisible(productMode?: ProductMode): boolean {
  if (!productMode) return isCommercialBillingVisible();
  return productMode === "SAAS";
}

export function isPlatformAdmin(role: string | null | undefined): role is "platform_admin" {
  return isPlatformAdminRole(role);
}

export function isTenantManager(role: string | null | undefined): boolean {
  return isTenantManagerRole(role);
}

export function isOperator(role: string | null | undefined): role is "operator" {
  return isOperatorRole(role);
}

export function canManageAutomation(role: string | null | undefined): boolean {
  return isTenantManager(role);
}

export function canViewAutomation(role: string | null | undefined): boolean {
  return isOperator(role) || isTenantManager(role);
}

export function canManageTeam(role: string | null | undefined): boolean {
  return isTenantManager(role);
}

export function canViewTeamPage(role: string | null | undefined): boolean {
  return isTenantManager(role);
}

export function canManageQueues(role: string | null | undefined): boolean {
  return isTenantManager(role);
}

export function canViewQueues(role: string | null | undefined): boolean {
  return isOperator(role) || isTenantManager(role);
}

export function canAccessBilling(
  role: string | null | undefined,
  productMode?: ProductMode
): boolean {
  if (isPlatformAdmin(role)) return true;
  if (!isTenantManager(role)) return false;
  return resolveCommercialVisible(productMode);
}

export function canAccessDeveloperSettings(role: string | null | undefined): boolean {
  return isPlatformAdmin(role);
}

export function canManageWhatsappChannels(role: string | null | undefined): boolean {
  return isTenantManager(role);
}

export function canAccessPlatformAdmin(role: string | null | undefined): boolean {
  return isPlatformAdmin(role);
}

export function canAccessRoute(
  role: string | null | undefined,
  path: string,
  context?: { productMode?: ProductMode }
): boolean {
  const p = (path.split("?")[0] ?? path).trim();
  if (p.startsWith("/admin") || p.startsWith("/api/admin")) return canAccessPlatformAdmin(role);
  if (p === "/settings/developer" || p.startsWith("/settings/developer/")) {
    return canAccessDeveloperSettings(role);
  }
  if (p === "/agents" || p.startsWith("/agents/")) return canViewTeamPage(role);
  if (p === "/queues" || p.startsWith("/queues/")) return canViewQueues(role);
  if (p === "/automation" || p.startsWith("/automation/")) return canViewAutomation(role);
  if (p === "/billing" || p.startsWith("/billing/")) {
    return canAccessBilling(role, context?.productMode);
  }
  if (p === "/dashboard/whatsapp" || p.startsWith("/dashboard/whatsapp/")) {
    return canManageWhatsappChannels(role);
  }
  if (p === "/inbox" || p.startsWith("/inbox/")) return isOperator(role) || isTenantManager(role);
  if (p === "/conversations" || p.startsWith("/conversations/")) return isOperator(role) || isTenantManager(role);
  if (p === "/distribuir" || p.startsWith("/distribuir/")) return isOperator(role) || isTenantManager(role);
  return true;
}
