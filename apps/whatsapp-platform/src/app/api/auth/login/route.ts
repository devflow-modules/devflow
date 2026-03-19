import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { login, buildSetCookieHeader, signToken } from "@/modules/auth";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "E-mail e senha obrigatórios" }, { status: 400 });
  }

  const result = await login(parsed.data.email, parsed.data.password);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 401 });
  }

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
