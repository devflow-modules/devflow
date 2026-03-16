import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { login, signToken } from "@/modules/auth";
import { buildSetCookieHeader } from "@/modules/auth/cookies";
import { trackUserLogin } from "@/modules/analytics";

const bodySchema = z.object({ email: z.string().email(), password: z.string().min(1) });

export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Email e senha obrigatórios" }, { status: 400 });
  }
  const result = await login(parsed.data.email, parsed.data.password);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 401 });
  }
  const token = await signToken({
    sub: result.user.id,
    email: result.user.email,
    cpf: result.user.cpf,
    nome: result.user.nome,
    role: result.user.role,
  });
  trackUserLogin();
  const res = NextResponse.json({ user: result.user });
  res.headers.set("Set-Cookie", buildSetCookieHeader(token));
  return res;
}
