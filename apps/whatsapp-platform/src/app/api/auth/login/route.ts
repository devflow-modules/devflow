import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { login, buildSetCookieHeader, signToken } from "@/modules/auth";
import { logAuth } from "@/lib/auth-logger";
import { parseRequestJson } from "@/lib/parse-request-json";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const raw = await parseRequestJson(request);
  if (!raw.ok) {
    return NextResponse.json({ error: "Corpo JSON inválido" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(raw.data);
  if (!parsed.success) {
    return NextResponse.json({ error: "E-mail e senha obrigatórios" }, { status: 400 });
  }

  const result = await login(parsed.data.email, parsed.data.password);
  if ("error" in result) {
    logAuth({ type: "login_failed", reason: "invalid_credentials" });
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
