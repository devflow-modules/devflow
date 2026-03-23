import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { login, buildSetCookieHeader, signToken } from "@wa/modules/auth";
import { logAuth } from "@wa/lib/auth-logger";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const limit = checkRateLimit(ip, "login");
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Muitas tentativas. Tente novamente em alguns minutos." },
      {
        status: 429,
        headers: limit.retryAfter
          ? { "Retry-After": String(limit.retryAfter) }
          : undefined,
      }
    );
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "E-mail e senha obrigatórios" }, { status: 400 });
  }

  const result = await login(parsed.data.email, parsed.data.password);
  if ("error" in result) {
    logAuth({ type: "login_failed", reason: result.error });
    return NextResponse.json({ error: result.error }, { status: 401 });
  }

  logAuth({
    type: "login_success",
    userId: result.user.id,
    tenantId: result.user.tenantId,
    role: result.user.role,
  });

  const token = await signToken({
    sub: result.user.id,
    email: result.user.email,
    name: result.user.name,
    role: result.user.role,
    tenantId: result.user.tenantId,
  });
  const res = NextResponse.json({ user: result.user });
  res.headers.set("Set-Cookie", buildSetCookieHeader(token));
  return res;
}
