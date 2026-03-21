import { NextResponse } from "next/server";

/**
 * Protege rotas admin de onboarding WhatsApp.
 * Header: x-admin-whatsapp-secret = ADMIN_WHATSAPP_ONBOARDING_SECRET
 * Fallback: ADMIN_METRICS_SECRET (mesmo padrão de /api/admin/metrics).
 * Em desenvolvimento, se nenhum secret estiver definido, permite (apenas local).
 */
export function guardWhatsappOnboarding(
  request: Request
): NextResponse | null {
  const devOpen =
    process.env.NODE_ENV === "development" &&
    !process.env.ADMIN_WHATSAPP_ONBOARDING_SECRET?.trim() &&
    !process.env.ADMIN_METRICS_SECRET?.trim();
  if (devOpen) return null;

  const secret =
    process.env.ADMIN_WHATSAPP_ONBOARDING_SECRET?.trim() ||
    process.env.ADMIN_METRICS_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "ADMIN_SECRET_NOT_CONFIGURED",
          message:
            "Defina ADMIN_WHATSAPP_ONBOARDING_SECRET ou ADMIN_METRICS_SECRET.",
        },
      },
      { status: 503 }
    );
  }
  const h = request.headers.get("x-admin-whatsapp-secret");
  if (h !== secret) {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "Credencial admin inválida." } },
      { status: 403 }
    );
  }
  return null;
}
