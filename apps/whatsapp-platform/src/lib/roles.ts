export function isOperator(role: string | null | undefined): role is "operator" {
  return role === "operator";
}

export function isManager(role: string | null | undefined): role is "manager" {
  return role === "manager";
}

export function isPlatformAdmin(role: string | null | undefined): role is "platform_admin" {
  return role === "platform_admin";
}

/** Administração do tenant (não confundir com utilizador `platform_admin` da equipa interna). */
export function isTenantManager(role: string | null | undefined): boolean {
  return isManager(role) || isPlatformAdmin(role);
}

/**
 * «Distribuir próxima» no chrome da shell (sidebar expandida + rail).
 * Fail-closed: só operator e manager de tenant — não platform_admin nem role null.
 */
export function showDistribuirInShellNav(role: string | null | undefined): boolean {
  return isOperator(role) || isManager(role);
}

/**
 * Destino do logotipo / marca na shell.
 * Operator (e role null): Inbox. Manager / platform_admin: Painel geral (`/dashboard`).
 * IA operação (`/dashboard/ai`) fica na secção Automação e IA — não é home da marca.
 */
export function shellHomeHref(role: string | null | undefined): string {
  // Fail-closed: role ainda null → destino seguro de operator (não /dashboard/*).
  if (!role || isOperator(role)) return "/inbox";
  if (isTenantManager(role)) return "/dashboard";
  return "/dashboard";
}

/** Caminhos que o operador não deve usar (configuração / monetização / painel). */
export function isPathRestrictedForOperator(pathname: string): boolean {
  const p = pathname.split("?")[0] ?? pathname;
  if (p === "/onboarding") return true;
  if (p.startsWith("/settings")) return true;
  if (p === "/billing" || p.startsWith("/billing/")) return true;
  if (p === "/dashboard" || p.startsWith("/dashboard/")) return true;
  return false;
}

export function isNavItemHiddenForOperator(href: string): boolean {
  return isPathRestrictedForOperator(href);
}

export type { UserRole } from "@/modules/auth";
