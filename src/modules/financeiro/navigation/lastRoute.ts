import {
  FINANCEIRO_BASE_PATH,
  FINANCEIRO_DASHBOARD_PATH,
} from "./constants";

const TRANSIENT_PREFIXES = [
  `${FINANCEIRO_BASE_PATH}/auth`,
  `${FINANCEIRO_BASE_PATH}/invites/accept`,
] as const;

/** Rotas que não persistimos como “última relevante” (onboarding é fluxo guiado, não retomada típica) */
const NON_PERSISTABLE_SEGMENTS = new Set(["onboarding", "auth"]);

/**
 * Indica se o path pode ser salvo como última rota interna relevante.
 * Deve estar sob /ferramentas/financeiro, não ser transitório nem onboarding.
 */
export function isPersistableFinanceiroInternalPath(pathname: string): boolean {
  if (!pathname.startsWith(`${FINANCEIRO_BASE_PATH}/`)) return false;
  if (pathname === FINANCEIRO_BASE_PATH) return false;

  for (const p of TRANSIENT_PREFIXES) {
    if (pathname === p || pathname.startsWith(`${p}/`)) return false;
  }

  const rest = pathname.slice(FINANCEIRO_BASE_PATH.length + 1);
  const segment = rest.split("/")[0] ?? "";
  if (!segment || NON_PERSISTABLE_SEGMENTS.has(segment)) return false;

  return true;
}

export function isTransientFinanceiroPath(pathname: string): boolean {
  if (!pathname.startsWith(FINANCEIRO_BASE_PATH)) return true;
  for (const p of TRANSIENT_PREFIXES) {
    if (pathname === p || pathname.startsWith(`${p}/`)) return true;
  }
  return false;
}

/**
 * Normaliza valor do cookie ou path candidato para URL segura de redirect.
 * Evita loop: nunca retorna landing, auth ou path externo.
 */
export function normalizeResumeTargetPath(
  raw: string | undefined | null,
  fallback: string = FINANCEIRO_DASHBOARD_PATH
): string {
  if (!raw || typeof raw !== "string") return fallback;

  let decoded = raw.trim();
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    return fallback;
  }

  if (!decoded.startsWith("/")) return fallback;
  if (!decoded.startsWith(FINANCEIRO_BASE_PATH)) return fallback;
  if (decoded === FINANCEIRO_BASE_PATH) return fallback;
  if (isTransientFinanceiroPath(decoded)) return fallback;

  const rest = decoded.slice(FINANCEIRO_BASE_PATH.length + 1);
  const first = rest.split("/")[0] ?? "";
  if (first === "onboarding") return fallback;

  return decoded;
}
