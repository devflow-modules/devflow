import { financeiroAppHref } from "@/lib/financeiro-app-href";
import { FINANCEIRO_AUTH_PATH } from "./constants";

/** Redireciona para login com retorno à rota desejada (ex.: links no modo demo). */
export function financeiroAuthWithNext(
  nextPath: string,
  authPath: string = FINANCEIRO_AUTH_PATH
): string {
  const base = financeiroAppHref(authPath);
  if (base.startsWith("http://") || base.startsWith("https://")) {
    const u = new URL(base);
    u.searchParams.set("next", nextPath);
    return u.href;
  }
  return `${base}?next=${encodeURIComponent(nextPath)}`;
}
