import { FINANCEIRO_AUTH_PATH } from "./constants";

/** Redireciona para login com retorno à rota desejada (ex.: links no modo demo). */
export function financeiroAuthWithNext(
  nextPath: string,
  authPath: string = FINANCEIRO_AUTH_PATH
): string {
  return `${authPath}?next=${encodeURIComponent(nextPath)}`;
}
