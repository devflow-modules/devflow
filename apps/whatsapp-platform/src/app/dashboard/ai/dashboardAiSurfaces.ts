/**
 * Carga degradável por superfície em `/dashboard/ai` (dashboard-ai F4).
 * Cada API resolve de forma independente — falha parcial não zera a página.
 */

import { fetchProtected, protectedApiUserMessage } from "@/lib/protected-fetch";

export type DashboardAiSurfaceId =
  | "metrics"
  | "logs"
  | "funnel"
  | "leadQuality"
  | "opportunities";

export type SurfaceSnapshot<T> = {
  status: "loading" | "ready" | "error";
  data: T | null;
  error: string | null;
};

export function initialSurface<T>(data: T | null = null): SurfaceSnapshot<T> {
  return { status: "loading", data, error: null };
}

export function surfaceReady<T>(data: T): SurfaceSnapshot<T> {
  return { status: "ready", data, error: null };
}

export function surfaceError<T>(error: string, data: T | null = null): SurfaceSnapshot<T> {
  return { status: "error", data, error };
}

export type FetchProtectedFn = typeof fetchProtected;

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  error?: string;
};

export async function fetchAiSurfaceData<T>(
  path: string,
  options?: {
    fetchFn?: FetchProtectedFn;
    allowEmptyArray?: boolean;
  }
): Promise<{ data: T | null; error: string | null }> {
  const fetchFn = options?.fetchFn ?? fetchProtected;
  try {
    const res = await fetchFn(path);
    const j = (await res.json().catch(() => ({}))) as ApiEnvelope<T>;
    if (!res.ok) {
      return { data: null, error: protectedApiUserMessage(res.status, j) };
    }
    if (j.data === undefined || j.data === null) {
      if (options?.allowEmptyArray) {
        return { data: [] as unknown as T, error: null };
      }
      return { data: null, error: "Resposta incompleta do servidor" };
    }
    return { data: j.data, error: null };
  } catch {
    return { data: null, error: "Erro ao carregar dados" };
  }
}

export function applySurfaceResult<T>(
  result: { data: T | null; error: string | null },
  previous: T | null = null
): SurfaceSnapshot<T> {
  if (result.error) {
    return surfaceError(result.error, previous);
  }
  if (result.data === null) {
    return surfaceError("Resposta incompleta do servidor", previous);
  }
  return surfaceReady(result.data);
}

/** Superfícies essenciais à 1ª dobra (ações + KPIs). Health é canal aparte. */
export const DASHBOARD_AI_ESSENTIAL_SURFACES = ["opportunities", "metrics"] as const;

/** Superfícies secundárias (progressive disclosure / eventos). */
export const DASHBOARD_AI_SECONDARY_SURFACES = ["funnel", "leadQuality", "logs"] as const;
