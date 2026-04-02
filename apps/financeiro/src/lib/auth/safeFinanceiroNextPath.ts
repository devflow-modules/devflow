import { FINANCEIRO_AUTH_PATH, FINANCEIRO_BASE_PATH } from "@devflow/financeiro-routes";

/**
 * Caminho interno seguro pós-login (sem open redirect).
 * Só aceita paths sob o produto Financeiro, exclui auth e landing.
 */
export function sanitizeFinanceiroNextPath(raw: string | null | undefined): string | null {
  if (raw == null || raw === "") return null;
  const pathname = raw.trim().split("?")[0].split("#")[0];
  if (!pathname.startsWith("/") || pathname.includes("//")) return null;
  if (!pathname.startsWith(`${FINANCEIRO_BASE_PATH}/`)) return null;
  if (pathname === FINANCEIRO_BASE_PATH || pathname === `${FINANCEIRO_BASE_PATH}/`) return null;
  const authPrefix = `${FINANCEIRO_AUTH_PATH}`;
  if (pathname === authPrefix || pathname.startsWith(`${authPrefix}/`)) return null;
  return pathname;
}
