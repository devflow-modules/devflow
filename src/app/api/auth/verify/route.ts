import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@wa/modules/auth";

/**
 * GET /api/auth/verify
 * Valida sessão JWT no frontend: checa token, expiração e retorna user se válido.
 * Usado para: proteger páginas SPA, checar sessão em load, evitar lógica duplicada.
 */
export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ valid: false }, { status: 401 });
  }

  const { payload } = auth;
  return NextResponse.json({
    valid: true,
    user: {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role,
      tenantId: payload.tenantId,
    },
  });
}
