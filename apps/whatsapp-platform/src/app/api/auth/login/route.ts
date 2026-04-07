import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { login, buildSetCookieHeader, signToken } from "@/modules/auth";
import { createUserSession } from "@/modules/auth/sessionService";
import { logAuth } from "@/lib/auth-logger";
import { recordPlatformAudit } from "@/lib/platformAuditLog";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { parseRequestJson } from "@/lib/parse-request-json";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const limit = checkRateLimit(ip, "auth-login");
  if (!limit.ok) {
    logAuth({ type: "rate_limited", route: "login", ip });
    return NextResponse.json(
      {
        error: "Muitas tentativas de início de sessão. Tente novamente em alguns minutos.",
        code: "RATE_LIMITED",
      },
      {
        status: 429,
        headers: limit.retryAfter ? { "Retry-After": String(limit.retryAfter) } : undefined,
      }
    );
  }

  const raw = await parseRequestJson(request);
  if (!raw.ok) {
    return NextResponse.json({ error: "Corpo JSON inválido" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(raw.data);
  if (!parsed.success) {
    return NextResponse.json({ error: "E-mail e senha obrigatórios" }, { status: 400 });
  }

  try {
    const result = await login(parsed.data.email, parsed.data.password);
    if ("error" in result) {
      logAuth({ type: "login_failed", reason: "invalid_credentials", ip });
      return NextResponse.json(
        { error: result.error, code: "INVALID_CREDENTIALS" },
        { status: 401 }
      );
    }

    const { sessionId } = await createUserSession(result.user.id);

    logAuth({
      type: "login_success",
      userId: result.user.id,
      tenantId: result.user.tenantId,
      role: result.user.role,
      sessionId,
    });
    recordPlatformAudit({
      action: "login_success",
      tenantId: result.user.tenantId,
      userId: result.user.id,
      ip,
      metadata: { role: result.user.role },
    });

    const token = await signToken({
      sub: result.user.id,
      email: result.user.email,
      name: result.user.name,
      role: result.user.role,
      tenantId: result.user.tenantId,
      jti: sessionId,
    });
    const res = NextResponse.json({ user: result.user });
    res.headers.set("Set-Cookie", buildSetCookieHeader(token));
    return res;
  } catch (err) {
    console.error("[auth][login]", err);
    const msg = err instanceof Error ? err.message : String(err);
    const jwtMissing = msg.includes("JWT_SECRET");
    const userMessage = jwtMissing
      ? "Servidor sem JWT_SECRET configurado. Contacte o administrador."
      : "Não foi possível iniciar sessão (serviço indisponível). Verifique a base de dados e tente novamente.";
    logAuth({
      type: "login_failed",
      reason: "server_error",
      ip,
      detail: jwtMissing ? "jwt_secret" : "exception",
    });
    return NextResponse.json(
      { error: userMessage, code: jwtMissing ? "LOGIN_MISCONFIGURED" : "LOGIN_UNAVAILABLE" },
      { status: 503 }
    );
  }
}
