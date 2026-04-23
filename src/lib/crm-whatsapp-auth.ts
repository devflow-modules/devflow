import { cookies } from "next/headers";
import { jwtVerify, type JWTPayload } from "jose";
import { JWT_COOKIE_NAME, getJwtSecret } from "./auth-config";

export type CrmWhatsappSession = {
  sub: string;
  tenantId: string;
  email: string;
  name: string;
  role: string;
};

type WaJwt = JWTPayload & { sub?: string; tenantId?: string; email?: string; name?: string; role?: string };

/**
 * Sessão CRM a partir do mesmo JWT do WhatsApp Platform (`whatsapp_platform_token`).
 * Em dev, pode não existir cookie; rotas usam isso para atribuição e filtros "meus".
 */
export async function getCrmWhatsappSessionFromCookies(): Promise<CrmWhatsappSession | null> {
  let secret: string;
  try {
    secret = getJwtSecret();
  } catch {
    return null;
  }
  try {
    const store = await cookies();
    const token = store.get(JWT_COOKIE_NAME)?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    const p = payload as WaJwt;
    if (!p.sub || !p.tenantId) return null;
    return {
      sub: String(p.sub),
      tenantId: String(p.tenantId),
      email: typeof p.email === "string" ? p.email : "",
      name: typeof p.name === "string" ? p.name : "",
      role: typeof p.role === "string" ? p.role : "",
    };
  } catch {
    return null;
  }
}

/**
 * Lê o JWT a partir de `Request` (API route com `Request` e não `cookies()`), útil em testes.
 */
export async function getCrmWhatsappSessionFromRequest(request: Request): Promise<CrmWhatsappSession | null> {
  let secret: string;
  try {
    secret = getJwtSecret();
  } catch {
    return null;
  }
  const h = request.headers.get("cookie") ?? "";
  const m = h.match(new RegExp(`${JWT_COOKIE_NAME}=([^;]+)`));
  const token = m?.[1] ? decodeURIComponent(m[1].trim()) : null;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    const p = payload as WaJwt;
    if (!p.sub || !p.tenantId) return null;
    return {
      sub: String(p.sub),
      tenantId: String(p.tenantId),
      email: typeof p.email === "string" ? p.email : "",
      name: typeof p.name === "string" ? p.name : "",
      role: typeof p.role === "string" ? p.role : "",
    };
  } catch {
    return null;
  }
}
