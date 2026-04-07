import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyPasswordResetTokenResult, updateUserPassword } from "@/modules/auth";
import { revokeAllSessionsForUser } from "@/modules/auth/sessionService";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { logAuth } from "@/lib/auth-logger";
import { parseRequestJson } from "@/lib/parse-request-json";

const bodySchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8, "Senha deve ter no mínimo 8 caracteres"),
});

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const limit = checkRateLimit(ip, "reset-password");
  if (!limit.ok) {
    logAuth({ type: "rate_limited", route: "reset-password", ip });
    return NextResponse.json(
      { error: "Muitas tentativas. Tente novamente em alguns minutos.", code: "RATE_LIMITED" },
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
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Dados inválidos" },
      { status: 400 }
    );
  }

  const vr = await verifyPasswordResetTokenResult(parsed.data.token);
  if (!vr.ok) {
    const code = vr.reason === "expired" ? "RESET_TOKEN_EXPIRED" : "RESET_TOKEN_INVALID";
    const error =
      vr.reason === "expired"
        ? "Este link expirou. Solicite um novo e-mail de redefinição."
        : "Link inválido. Use o link completo do e-mail ou solicite um novo.";
    return NextResponse.json({ error, code }, { status: 400 });
  }

  const ok = await updateUserPassword(vr.payload.sub, parsed.data.newPassword);
  if (!ok) {
    return NextResponse.json({ error: "Falha ao atualizar senha." }, { status: 500 });
  }

  await revokeAllSessionsForUser(vr.payload.sub);
  logAuth({ type: "sessions_revoked_all", userId: vr.payload.sub, reason: "password_reset" });
  logAuth({ type: "password_reset_success", userId: vr.payload.sub });

  return NextResponse.json({
    success: true,
    message: "Senha alterada com sucesso. Faça login com a nova senha.",
  });
}
