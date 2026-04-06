import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest, requireRole } from "@/modules/auth";
import { createBillingPortalSession } from "@/modules/billing/billingService";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  const denied = requireRole(auth, ["admin"]);
  if (denied) return denied;
  if (!auth) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_WHATSAPP_APP_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    request.nextUrl.origin ??
    "http://localhost:3004";
  const returnUrl = `${baseUrl.replace(/\/$/, "")}/billing`;

  try {
    const { portalUrl } = await createBillingPortalSession(auth.payload.tenantId, returnUrl);
    return NextResponse.json({
      success: true,
      data: { url: portalUrl },
    });
  } catch (e) {
    console.error("[billing/portal]", e);
    const msg = e instanceof Error ? e.message : "Portal indisponível";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
