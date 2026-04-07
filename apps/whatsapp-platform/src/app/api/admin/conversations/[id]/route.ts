import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { listTenants } from "@/modules/tenants";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing conversation id" }, { status: 400 });
  }
  try {
    const tenants = await listTenants();
    const tenantId = tenants[0]?.id;
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant" }, { status: 404 });
    }
    const thread = await prisma.waInboxThread.findFirst({
      where: { id, tenantId },
      select: {
        id: true,
        phoneNumber: true,
        contactName: true,
        status: true,
      },
    });
    if (!thread) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }
    return NextResponse.json({
      id: thread.id,
      customerName: thread.contactName ?? thread.phoneNumber,
      status: thread.status,
    });
  } catch (err) {
    console.error("[GET /api/admin/conversations/:id]", err);
    return NextResponse.json({ error: "Failed to load conversation" }, { status: 500 });
  }
}
