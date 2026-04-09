import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyTokenResult } from "./authService";
import { getTokenFromCookie } from "./cookies";
import { JWT_COOKIE_NAME } from "@/lib/auth-config";
import { logAuth } from "@/lib/auth-logger";
import type { JwtPayload, UserRole } from "./authService";

/** Inbox, filas, conversas — operator+ */
export const ROLES_OPERATIONAL: UserRole[] = ["operator", "manager", "platform_admin"];

/** Dashboard tenant, billing, export CSV, PATCH tenant — manager+ */
export const ROLES_MANAGER_PLUS: UserRole[] = ["manager", "platform_admin"];

/** Rotas exclusivas da plataforma (staff). */
export const ROLES_PLATFORM_ONLY: UserRole[] = ["platform_admin"];

/** @deprecated Preferir `ROLES_OPERATIONAL`. */
export const STAFF_ROLES: UserRole[] = ROLES_OPERATIONAL;

export interface AuthResult {
  payload: JwtPayload;
  token: string;
  sessionId: string;
}

/**
 * Validação canónica: assinatura JWT + sessão não revogada + utilizador atual na DB.
 * Claims finais vêm da DB (role, tenant, email, nome) para evitar dados obsoletos no token.
 */
export async function validateAuthToken(rawToken: string): Promise<AuthResult | null> {
  const verified = await verifyTokenResult(rawToken);
  if (!verified.ok) {
    logAuth({
      type: "session_rejected",
      reason: verified.reason === "expired" ? "jwt_expired" : "jwt_invalid",
    });
    return null;
  }
  const cryptoPayload = verified.payload;

  const jti = typeof cryptoPayload.jti === "string" ? cryptoPayload.jti.trim() : "";

  if (!jti) {
    logAuth({ type: "session_rejected", reason: "missing_jti" });
    return null;
  }

  const sub = cryptoPayload.sub;
  if (!sub) {
    logAuth({ type: "session_rejected", reason: "missing_sub" });
    return null;
  }

  const now = new Date();
  const session = await prisma.userSession.findFirst({
    where: {
      id: jti,
      userId: sub,
      revokedAt: null,
      expiresAt: { gt: now },
    },
  });

  if (!session) {
    logAuth({ type: "session_rejected", reason: "session_not_found_or_expired", userId: sub });
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: sub },
    select: { id: true, email: true, name: true, role: true, tenantId: true },
  });

  if (!user) {
    logAuth({ type: "session_rejected", reason: "user_not_found", userId: sub });
    await prisma.userSession.update({ where: { id: jti }, data: { revokedAt: now } }).catch(() => {});
    return null;
  }

  if (user.tenantId !== cryptoPayload.tenantId) {
    logAuth({
      type: "tenant_mismatch",
      userId: user.id,
      resourceTenantId: user.tenantId,
      userTenantId: String(cryptoPayload.tenantId),
    });
    await prisma.userSession.update({ where: { id: jti }, data: { revokedAt: now } }).catch(() => {});
    return null;
  }

  const normalized: JwtPayload = {
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role as UserRole,
    tenantId: user.tenantId,
    jti,
    iat: cryptoPayload.iat,
    exp: cryptoPayload.exp,
  };

  return { payload: normalized, token: rawToken, sessionId: jti };
}

export async function getAuthFromRequest(request: NextRequest): Promise<AuthResult | null> {
  const fromCookie = request.cookies.get(JWT_COOKIE_NAME)?.value;
  const token = fromCookie ?? getTokenFromCookie(request.headers.get("cookie"));
  if (!token) return null;
  return validateAuthToken(token);
}

/**
 * Verifica se o utilizador tem uma das roles permitidas.
 * Retorna NextResponse 401/403 se não autorizado; caso contrário null.
 */
export function requireRole(
  auth: AuthResult | null,
  allowedRoles: UserRole[],
  req?: Pick<NextRequest, "nextUrl" | "method">
): NextResponse | null {
  if (!auth) {
    logAuth({
      type: "unauthorized",
      path: req?.nextUrl?.pathname,
      method: req?.method,
    });
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  if (!allowedRoles.includes(auth.payload.role as UserRole)) {
    logAuth({
      type: "forbidden",
      userId: auth.payload.sub,
      tenantId: auth.payload.tenantId,
      requiredRole: allowedRoles.join("|"),
      path: req?.nextUrl?.pathname,
      method: req?.method,
    });
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }
  return null;
}
