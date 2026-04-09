import type { UserRole } from "@/modules/auth";

export function isAdmin(role: string | null | undefined): role is "admin" {
  return role === "admin";
}

export function isAgent(role: string | null | undefined): role is "agent" {
  return role === "agent";
}

/** Caminho de navegação que agentes não devem usar (configuração / integrações). */
export function isPathRestrictedForAgent(pathname: string): boolean {
  const p = pathname.split("?")[0] ?? pathname;
  if (p === "/onboarding") return true;
  if (p.startsWith("/settings")) return true;
  if (p === "/billing" || p.startsWith("/billing/")) return true;
  if (p === "/dashboard/whatsapp" || p.startsWith("/dashboard/whatsapp/")) return true;
  return false;
}

/** Item de navegação (href) oculto para agentes. */
export function isNavItemHiddenForAgent(href: string): boolean {
  return isPathRestrictedForAgent(href);
}

export type { UserRole } from "@/modules/auth";
