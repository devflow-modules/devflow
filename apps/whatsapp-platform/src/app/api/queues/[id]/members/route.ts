import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthFromRequest, requireRole, ROLES_MANAGER_PLUS } from "@/modules/auth";
import { addQueueMember, removeQueueMember } from "@/modules/inbox/inboxOperationalQueueService";

export const dynamic = "force-dynamic";

const postSchema = z.object({
  userId: z.string().cuid(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(request);
  if (!auth) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id: queueId } = await params;
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "userId inválido" }, { status: 400 });
  }

  const res = await addQueueMember(auth.payload.tenantId, queueId, parsed.data.userId);
  if (!res.ok) {
    const status = res.reason === "not_found" ? 404 : 400;
    return NextResponse.json({ error: "Fila ou utilizador inválido" }, { status });
  }
  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(request);
  const denied = requireRole(auth, ROLES_MANAGER_PLUS, request);
  if (denied) return denied;

  const { id: queueId } = await params;
  const userId = request.nextUrl.searchParams.get("userId")?.trim();
  if (!userId) {
    return NextResponse.json({ error: "userId obrigatório" }, { status: 400 });
  }

  const ok = await removeQueueMember(auth!.payload.tenantId, queueId, userId);
  if (!ok) {
    return NextResponse.json({ error: "Membro não encontrado" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
