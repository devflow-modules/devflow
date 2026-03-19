import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/modules/auth";
import { getSubscriptionView } from "@/modules/billing/billingService";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ success: false, error: "Não autorizado" }, { status: 401 });
  }

  try {
    const data = await getSubscriptionView(auth.payload.tenantId);
    return NextResponse.json({
      success: true,
      data,
      examples: {
        statusValues: ["active", "canceled", "past_due", "trialing", "free"],
      },
    });
  } catch (e) {
    console.error("[billing/subscription]", e);
    return NextResponse.json(
      { success: false, error: "Erro ao carregar assinatura" },
      { status: 500 }
    );
  }
}
