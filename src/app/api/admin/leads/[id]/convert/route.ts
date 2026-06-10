import { NextResponse } from "next/server";
import { isAdminLeadsApiAllowed } from "@/lib/admin-leads-api-auth";
import {
  convertLeadToPilotSchema,
  convertLeadToWhatsappPilot,
  LeadPilotConversionError,
} from "@/lib/lead-pilot-conversion";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  if (!(await isAdminLeadsApiAllowed(request))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = convertLeadToPilotSchema.safeParse(body);
  if (!parsed.success) {
    const msg =
      parsed.error.flatten().formErrors[0] ??
      Object.values(parsed.error.flatten().fieldErrors).flat()[0] ??
      "Dados inválidos.";
    return NextResponse.json(
      { error: typeof msg === "string" ? msg : "Dados inválidos." },
      { status: 400 }
    );
  }

  try {
    const lead = await convertLeadToWhatsappPilot(id, parsed.data);
    return NextResponse.json({ lead });
  } catch (error) {
    if (error instanceof LeadPilotConversionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? (error as { code?: string }).code
        : undefined;
    if (code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    console.error("[POST /api/admin/leads/:id/convert]");
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
