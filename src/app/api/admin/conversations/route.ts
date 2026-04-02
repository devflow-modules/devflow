import { NextResponse } from "next/server";
import { guardWhatsappOnboarding } from "@/modules/whatsapp-onboarding";
import { prisma } from "@/lib/prisma-root";
import {
  countConversations,
  listConversations,
} from "@/modules/whatsapp-inbox/whatsappInbox.conversation.service";

function onboardingJson<T>(data: T, status = 200) {
  return NextResponse.json({ success: true as const, data }, { status });
}

export async function GET(request: Request) {
  const denied = guardWhatsappOnboarding(request);
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const take = Math.min(
    Math.max(1, parseInt(searchParams.get("limit") || "50", 10) || 50),
    200
  );
  const skip = Math.max(0, parseInt(searchParams.get("offset") || "0", 10) || 0);

  try {
    const [conversations, total] = await Promise.all([
      listConversations(prisma, { take, skip }),
      countConversations(prisma),
    ]);
    return onboardingJson({
      conversations,
      pagination: { limit: take, offset: skip, total },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { success: false as const, error: { code: "LIST_FAILED", message: msg } },
      { status: 500 }
    );
  }
}
