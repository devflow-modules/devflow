import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/modules/auth";
import { getTenantBillingUI } from "@/modules/billing";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ success: false, error: "Não autorizado" }, { status: 401 });
  }

  try {
    const data = await getTenantBillingUI(auth.payload.tenantId);
    return NextResponse.json({ success: true, data });
  } catch (e) {
    console.error("[billing/ui]", e);
    return NextResponse.json(
      { success: false, error: "Erro ao carregar billing" },
      { status: 500 }
    );
  }
}
