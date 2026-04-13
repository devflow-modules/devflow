import { NextRequest } from "next/server";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import { getAuthFromRequest, requireRole, ROLES_MANAGER_PLUS } from "@/modules/auth";
import { createBillingPortalSession } from "@/modules/billing/billingService";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  const denied = requireRole(auth, ROLES_MANAGER_PLUS, request);
  if (denied) return denied;
  if (!auth) {
    return jsonError("UNAUTHORIZED", "Não autorizado", 401);
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_WHATSAPP_APP_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    request.nextUrl.origin ??
    "http://localhost:3000";
  const returnUrl = `${baseUrl.replace(/\/$/, "")}/billing`;

  try {
    const { portalUrl } = await createBillingPortalSession(auth.payload.tenantId, returnUrl);
    return jsonSuccess({ url: portalUrl });
  } catch (e) {
    console.error("[billing/portal]", e);
    const msg = e instanceof Error ? e.message : "Portal indisponível";
    return jsonError("BILLING_PORTAL_FAILED", msg, 400);
  }
}
