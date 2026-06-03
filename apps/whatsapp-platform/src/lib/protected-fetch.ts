import { loginUrlWithNext } from "./safe-redirect";

let loginRedirectScheduled = false;

/** Mensagem curta quando a API protegida devolve 401 (sessão inexistente ou expirada). */
export const PROTECTED_API_SESSION_EXPIRED =
  "Sessão expirada ou inválida. A redirecionar para o login…";

/** Mensagem quando a API devolve 403 (sem permissão). Nunca dispara redirect. */
export const PROTECTED_API_FORBIDDEN = "Acesso negado. Não tem permissão para esta operação.";

const AUTH_PUBLIC_UI_PREFIXES = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/admin/login",
] as const;

/** Páginas de auth onde 401 é esperado e não deve forçar redirect (ex.: credenciais erradas no login). */
export function isAuthPublicUIPagePath(pathname: string): boolean {
  return AUTH_PUBLIC_UI_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function shouldRedirectOn401(): boolean {
  if (typeof window === "undefined") return false;
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") return false;
  return !isAuthPublicUIPagePath(window.location.pathname);
}

function scheduleLoginRedirect(): void {
  if (typeof window === "undefined" || loginRedirectScheduled) return;
  loginRedirectScheduled = true;
  const path = `${window.location.pathname}${window.location.search}`;
  window.location.assign(loginUrlWithNext(path));
}

/**
 * `fetch` para rotas da app que exigem sessão: envia cookies e, fora das páginas de auth,
 * em **401** redireciona uma única vez para `/login?next=` seguro.
 * **403** não redireciona — trate na UI com {@link protectedApiUserMessage}.
 */
export async function fetchProtected(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const res = await fetch(input, {
    ...init,
    credentials: init?.credentials ?? "include",
  });
  if (res.status === 401 && shouldRedirectOn401()) {
    scheduleLoginRedirect();
  }
  return res;
}

/** Corpo 403 quando uma feature do plano bloqueia a operação (API interna). */
export type FeatureNotAvailablePayload = {
  code: "FEATURE_NOT_AVAILABLE";
  feature: string;
  currentPlan: string;
  requiredPlan: string;
  message?: string;
};

export class FeatureBlockedError extends Error {
  readonly name = "FeatureBlockedError";

  constructor(public readonly payload: FeatureNotAvailablePayload) {
    super(payload.message?.trim() || "Esta funcionalidade não está disponível no seu plano.");
    Object.setPrototypeOf(this, FeatureBlockedError.prototype);
  }
}

export function parseFeatureNotAvailable(data: unknown): FeatureNotAvailablePayload | null {
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  if (o.code !== "FEATURE_NOT_AVAILABLE") return null;
  const feature = o.feature;
  const currentPlan = o.currentPlan;
  const requiredPlan = o.requiredPlan;
  if (typeof feature !== "string" || typeof currentPlan !== "string" || typeof requiredPlan !== "string") {
    return null;
  }
  return {
    code: "FEATURE_NOT_AVAILABLE",
    feature,
    currentPlan,
    requiredPlan,
    message: typeof o.message === "string" ? o.message : undefined,
  };
}

export function isFeatureBlockedError(e: unknown): e is FeatureBlockedError {
  return e instanceof FeatureBlockedError;
}

function extractApiErrorMessage(data: {
  error?: string | { code?: string; message?: string };
  message?: string;
}): string | undefined {
  const e = data.error;
  if (typeof e === "string") return e;
  if (e && typeof e === "object" && typeof e.message === "string") return e.message;
  return data.message;
}

export function protectedApiUserMessage(
  status: number,
  data: { error?: string | { code?: string; message?: string }; message?: string; code?: string }
): string {
  const fallback = extractApiErrorMessage(data);
  if (status === 401) {
    return PROTECTED_API_SESSION_EXPIRED;
  }
  if (status === 403) {
    const blocked = parseFeatureNotAvailable(data);
    if (blocked?.message?.trim()) return blocked.message.trim();
    return fallback?.trim() ? fallback : PROTECTED_API_FORBIDDEN;
  }
  return fallback ?? "Não foi possível concluir o pedido. Tente novamente.";
}
