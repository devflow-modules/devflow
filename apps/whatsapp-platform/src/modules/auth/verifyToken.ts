import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "./authService";
import { getTokenFromCookie } from "./cookies";
import { JWT_COOKIE_NAME } from "@/lib/auth-config";
import { logAuth } from "@/lib/auth-logger";
import type { JwtPayload, UserRole } from "./authService";

export interface AuthResult {
  payload: JwtPayload;
  token: string;
}

export async function getAuthFromRequest(request: NextRequest): Promise<AuthResult | null> {
  const fromCookie = request.cookies.get(JWT_COOKIE_NAME)?.value;
  const token = fromCookie ?? getTokenFromCookie(request.headers.get("cookie"));
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload) return null;
  return { payload, token };
}

/**
 * Verifica se o usuário tem uma das roles permitidas.
 * Retorna NextResponse 403 se não tiver; caso contrário retorna null (autorizado).
 */
export function requireRole(
  auth: AuthResult | null,
  allowedRoles: UserRole[]
): NextResponse | null {
  if (!auth) {
    logAuth({ type: "unauthorized" });
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  if (!allowedRoles.includes(auth.payload.role as UserRole)) {
    logAuth({
      type: "forbidden",
      userId: auth.payload.sub,
      tenantId: auth.payload.tenantId,
      requiredRole: allowedRoles.join("|"),
    });
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }
  return null;
}
