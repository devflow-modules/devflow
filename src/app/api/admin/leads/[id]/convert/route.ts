import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma-root";
import { isAdminLeadsApiAllowed } from "@/lib/admin-leads-api-auth";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  if (!(await isAdminLeadsApiAllowed(request))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  try {
    if (request.headers.get("content-type")?.includes("application/json")) {
      await request.json().catch(() => ({}));
    }
  } catch {
    // sem corpo ou JSON inválido — segue
  }

  try {
    const current = await prisma.lead.findUnique({ where: { id } });
    if (!current) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (current.convertedAt != null) {
      return NextResponse.json(
        { error: "Lead já convertido", convertedAt: current.convertedAt.toISOString() },
        { status: 409 }
      );
    }

    const now = new Date();
    const lead = await prisma.lead.update({
      where: { id },
      data: {
        convertedAt: now,
        convertedToType: "whatsapp_platform",
        convertedToRef: null,
        status: "fechado",
        lastContactAt: now,
      },
    });
    return NextResponse.json({ lead });
  } catch (e: unknown) {
    const code = typeof e === "object" && e !== null && "code" in e ? (e as { code?: string }).code : undefined;
    if (code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
