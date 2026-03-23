import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  verifyPasswordResetToken,
  updateUserPassword,
} from "@wa/modules/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { logAuth } from "@wa/lib/auth-logger";

const bodySchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8, "Senha deve ter no mínimo 8 caracteres"),
});

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const limit = checkRateLimit(ip, "reset-password");
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Muitas tentativas. Tente novamente em alguns minutos." },
      {
        status: 429,
        headers: limit.retryAfter ? { "Retry-After": String(limit.retryAfter) } : undefined,
      }
    );
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Dados inválidos" },
      { status: 400 }
    );
  }

  const payload = await verifyPasswordResetToken(parsed.data.token);
  if (!payload) {
    return NextResponse.json(
      { error: "Link inválido ou expirado. Solicite um novo." },
      { status: 400 }
    );
  }

  const ok = await updateUserPassword(payload.sub, parsed.data.newPassword);
  if (!ok) {
    return NextResponse.json(
      { error: "Falha ao atualizar senha." },
      { status: 500 }
    );
  }

  logAuth({ type: "password_reset_success", userId: payload.sub });

  return NextResponse.json({
    success: true,
    message: "Senha alterada com sucesso. Faça login com a nova senha.",
  });
}
