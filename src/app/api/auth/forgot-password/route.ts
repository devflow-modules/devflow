import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  findUserByEmail,
  signPasswordResetToken,
} from "@wa/modules/auth";
import { sendEmail, buildResetPasswordEmailHtml } from "@/lib/email";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { logAuth } from "@wa/lib/auth-logger";

const bodySchema = z.object({
  email: z.string().email(),
});

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const limit = checkRateLimit(ip, "forgot-password");
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
  const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;

  const emailResult = await sendEmail({
    to: user.email,
    subject: "Redefinição de senha",
    html: buildResetPasswordEmailHtml({ resetUrl }),
  });

  if (!emailResult.ok) {
    console.error("[forgot-password] Email send failed", emailResult.error);
    return NextResponse.json(
      { error: "Falha ao enviar e-mail. Tente novamente mais tarde." },
      { status: 503 }
    );
  }

  logAuth({ type: "password_reset_requested", userId: user.id, tenantId: user.tenantId });

  return NextResponse.json({
    success: true,
    message: "Se o e-mail existir, você receberá um link para redefinir a senha.",
  });
}
