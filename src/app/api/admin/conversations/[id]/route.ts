import { NextResponse } from "next/server";
import { guardWhatsappOnboarding } from "@/modules/whatsapp-onboarding";
import { prisma } from "@/modules/financeiro/lib/db";
import { getConversationById } from "@/modules/whatsapp-inbox/whatsappInbox.conversation.service";
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

  try {
    const conversation = await getConversationById(prisma, parsed.data);
    if (!conversation) {
      return NextResponse.json(
        { success: false as const, error: { code: "NOT_FOUND", message: "Conversa não encontrada" } },
        { status: 404 }
      );
    }
    return onboardingJson({ conversation });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { success: false as const, error: { code: "GET_FAILED", message: msg } },
      { status: 500 }
    );
  }
}
