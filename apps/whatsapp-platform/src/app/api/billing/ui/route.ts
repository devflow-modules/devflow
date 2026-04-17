import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/modules/auth";
import { getTenantBillingUI } from "@/modules/billing";
import {
  logBillingInternal,
  sanitizeTenantBillingUI,
  shouldSanitizeBillingResponse,
} from "@/modules/billing/billingSanitizer";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ success: false, error: "Não autorizado" }, { status: 401 });
  }

  try {
    const raw = await getTenantBillingUI(auth.payload.tenantId);
    if (shouldSanitizeBillingResponse(auth.payload)) {
      logBillingInternal("GET /api/billing/ui", auth.payload.tenantId, raw);
    }
    const data = sanitizeTenantBillingUI(raw, auth.payload);
    return NextResponse.json({ success: true, data });
  } catch (e) {
    console.error("[billing/ui]", e);
    return NextResponse.json(
      { success: false, error: "Erro ao carregar billing" },
      { status: 500 }
    );
  }
}
