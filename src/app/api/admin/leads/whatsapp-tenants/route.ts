import { NextResponse } from "next/server";
import { isAdminLeadsApiAllowed } from "@/lib/admin-leads-api-auth";
import { listWhatsappPilotTenantsForAdmin } from "@/lib/lead-pilot-conversion";

export async function GET(request: Request) {
  if (!(await isAdminLeadsApiAllowed(request))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const tenants = await listWhatsappPilotTenantsForAdmin();
    return NextResponse.json({ tenants });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("WHATSAPP_DATABASE_URL")) {
      return NextResponse.json(
        {
          tenants: [],
          warning: "WHATSAPP_DATABASE_URL não configurada — associe tenantId manualmente na conversão (dev).",
        },
        { status: 200 }
      );
    }
    console.error("[GET /api/admin/leads/whatsapp-tenants]");
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
