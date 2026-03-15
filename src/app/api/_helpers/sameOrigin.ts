import { NextRequest, NextResponse } from "next/server";
import { sendError } from "@/lib/financeiro/api-response";

/**
 * Verifica se a requisição vem do mesmo origin (mitigação CSRF).
 * Deve ser chamado no início de handlers mutáveis (POST/PATCH/DELETE).
 * Retorna NextResponse (403) se Origin/Referer inválidos; null se OK.
 */
export function assertSameOrigin(request: NextRequest): NextResponse | null {
  const expectedOrigin = request.nextUrl.origin;
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  if (origin !== null && origin !== undefined) {
    if (origin !== expectedOrigin) {
      return sendError("Origin inválido", 403, undefined, "INVALID_ORIGIN");
    }
    return null;
  }

  if (referer !== null && referer !== undefined) {
    try {
      const refererUrl = new URL(referer);
      if (refererUrl.origin !== expectedOrigin) {
        return sendError("Referer inválido", 403, undefined, "INVALID_REFERER");
      }
      return null;
    } catch {
      return sendError("Referer inválido", 403, undefined, "INVALID_REFERER");
    }
  }

  return sendError("Origin ou Referer obrigatório", 403, undefined, "ORIGIN_REQUIRED");
}
