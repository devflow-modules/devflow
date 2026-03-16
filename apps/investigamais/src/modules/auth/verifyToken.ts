import { NextRequest } from "next/server";
import { verifyToken } from "./authService";
import { getTokenFromCookie } from "./cookies";
import { JWT_COOKIE_NAME } from "@/lib/config";
import type { JwtPayload } from "./authService";

export interface AuthResult {
  payload: JwtPayload;
  token: string;
}

export async function getAuthFromRequest(request: NextRequest): Promise<AuthResult | null> {
  const cookieHeader = request.cookies.get(JWT_COOKIE_NAME)?.value ?? request.headers.get("cookie");
  const token = getTokenFromCookie(cookieHeader ?? null);
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload) return null;
  return { payload, token };
}

export function somenteRoles(allowed: JwtPayload["role"][]): (payload: JwtPayload) => boolean {
  return (payload) => allowed.includes(payload.role);
}
