import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { findUserByEmail, signPasswordResetToken } from "@/modules/auth";
import { sendTransactionalEmail } from "@/modules/email/application/sendTransactionalEmail";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { logAuth } from "@/lib/auth-logger";
import { parseRequestJson } from "@/lib/parse-request-json";

const bodySchema = z.object({
  email: z.string().email(),
});

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const limit = checkRateLimit(ip, "forgot-password");
  if (!limit.ok) {
    logAuth({ type: "rate_limited", route: "forgot-password", ip });
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
    return NextResponse.json({ error: "E-mail inválido" }, { status: 400 });
  }

  const user = await findUserByEmail(parsed.data.email);
  if (!user) {
    return NextResponse.json({
      success: true,
      message: "Se o e-mail existir, você receberá um link para redefinir a senha.",
    });
  }

  const token = await signPasswordResetToken(user.id, user.email);
  const baseUrl =
    process.env.NEXT_PUBLIC_WHATSAPP_APP_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    request.nextUrl.origin ??
    "http://localhost:3000";
  const resetUrl = `${baseUrl.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(token)}`;

  const emailResult = await sendTransactionalEmail({
    type: "RESET_PASSWORD",
    to: user.email,
    tenantId: user.tenantId,
    userId: user.id,
    payload: { userName: user.name, resetUrl },
  });

  if (!emailResult.ok) {
    console.error("[auth][forgot-password] falha ao enviar e-mail", emailResult.errorCode);
    if (emailResult.errorCode === "EMAIL_NOT_CONFIGURED") {
      return NextResponse.json(
        {
          error:
            "Envio de e-mail não está configurado no servidor. Defina RESEND_API_KEY e um remetente: EMAIL_FROM, RESEND_FROM ou RESEND_FROM_EMAIL (Resend).",
          code: "EMAIL_NOT_CONFIGURED",
        },
        { status: 503 }
      );
    }
    return NextResponse.json(
      {
        error: "Falha ao enviar e-mail. Tente novamente mais tarde.",
        code: "EMAIL_SEND_FAILED",
      },
      { status: 503 }
    );
  }

  logAuth({ type: "password_reset_requested", userId: user.id, tenantId: user.tenantId });

  return NextResponse.json({
    success: true,
    message: "Se o e-mail existir, você receberá um link para redefinir a senha.",
  });
}
