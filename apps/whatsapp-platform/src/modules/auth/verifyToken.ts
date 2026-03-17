import { NextRequest } from "next/server";
import { verifyToken } from "./authService";
import { getTokenFromCookie } from "./cookies";
import { JWT_COOKIE_NAME } from "@/lib/auth-config";
import type { JwtPayload } from "./authService";

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
