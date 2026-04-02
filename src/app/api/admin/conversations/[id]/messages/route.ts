import { NextResponse } from "next/server";
import { guardWhatsappOnboarding } from "@/modules/whatsapp-onboarding";
import { prisma } from "@/lib/prisma-root";
import { getConversationById } from "@/modules/whatsapp-inbox/whatsappInbox.conversation.service";
import { listMessagesForConversation } from "@/modules/whatsapp-inbox/whatsappInbox.message.service";
import { z } from "zod";

const uuidSchema = z.string().uuid();

function onboardingJson<T>(data: T) {
  return NextResponse.json({ success: true as const, data });
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const denied = guardWhatsappOnboarding(request);
  if (denied) return denied;

  const { id } = await context.params;
  const parsed = uuidSchema.safeParse(id);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false as const, error: { code: "INVALID_ID", message: "UUID inválido" } },
      { status: 400 }
    );
  }

  const { searchParams } = new URL(request.url);
  const take = Math.min(
    Math.max(1, parseInt(searchParams.get("limit") || "100", 10) || 100),
    500
  );
  const skip = Math.max(0, parseInt(searchParams.get("offset") || "0", 10) || 0);

  try {
    const conversation = await getConversationById(prisma, parsed.data);
    if (!conversation) {
      return NextResponse.json(
        { success: false as const, error: { code: "NOT_FOUND", message: "Conversa não encontrada" } },
        { status: 404 }
      );
    }
    const messages = await listMessagesForConversation(prisma, parsed.data, {
      take,
      skip,
    });
    return onboardingJson({
      conversationId: parsed.data,
      messages,
      pagination: { limit: take, offset: skip },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { success: false as const, error: { code: "LIST_FAILED", message: msg } },
      { status: 500 }
    );
  }
}
