import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { activateTenantMember } from "@/modules/inbox/teamProvisioningService";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { logAuth } from "@/lib/auth-logger";
import { parseRequestJson } from "@/lib/parse-request-json";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8, "Senha deve ter no mínimo 8 caracteres"),
});

/**
 * Activação one-shot de membro provisionado (define senha + status=active).
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const limit = checkRateLimit(ip, "activate-member");
  if (!limit.ok) {
    logAuth({ type: "rate_limited", route: "activate-member", ip });
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

  const result = await activateTenantMember({
    rawToken: parsed.data.token,
    newPassword: parsed.data.newPassword,
  });

  if (!result.ok) {
    const status = result.code === "INVALID_PASSWORD" ? 400 : 400;
    return NextResponse.json({ error: result.message, code: result.code }, { status });
  }

  logAuth({ type: "password_reset_success", userId: result.userId });

  return NextResponse.json({
    success: true,
    message: "Conta activada. Já pode iniciar sessão.",
  });
}
