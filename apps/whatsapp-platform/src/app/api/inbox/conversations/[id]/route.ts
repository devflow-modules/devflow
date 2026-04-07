import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/modules/auth";
import { waInboxGetThread, fetchWhatsappLineSummaries } from "@/modules/inbox";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
  }

  try {
    const thread = await waInboxGetThread(auth.payload.tenantId, id);
    if (!thread) {
      return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
    }
    const lineMap = await fetchWhatsappLineSummaries(auth.payload.tenantId, [
      thread.businessPhoneNumberId,
    ]);
    const whatsappLine =
      lineMap.get(thread.businessPhoneNumberId) ?? {
        phoneNumberId: thread.businessPhoneNumberId,
        label: null,
        displayPhoneNumber: null,
        isPrimary: false,
        isDefaultOutbound: false,
      };
    return NextResponse.json({ success: true, data: { thread: { ...thread, whatsappLine } } });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: { message: e instanceof Error ? e.message : "Erro" } },
      { status: 500 }
    );
  }
}
