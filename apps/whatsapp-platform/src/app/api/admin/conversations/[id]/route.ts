import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest, requireRole, ROLES_PLATFORM_ONLY } from "@/modules/auth";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing conversation id" }, { status: 400 });
  }
  try {
    const auth = await getAuthFromRequest(request);
    const denied = requireRole(auth, ROLES_PLATFORM_ONLY, request);
    if (denied) return denied;

    const tenantId = auth!.payload.tenantId;

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
