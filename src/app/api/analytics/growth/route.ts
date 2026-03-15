import { trackFunnelEvent } from "@/analytics/growth";
import type { DevflowFunnelEventName } from "@/analytics/devflowFunnelEvents";
import { DEVFLOW_FUNNEL_EVENTS } from "@/analytics/devflowFunnelEvents";
import { NextResponse } from "next/server";

const ALLOWED_EVENTS: DevflowFunnelEventName[] = Object.values(DEVFLOW_FUNNEL_EVENTS);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const event = body?.event as string | undefined;
    const sessionId = body?.sessionId as string | undefined;
    const userId = body?.userId as string | undefined;
    const householdId = body?.householdId as string | undefined;
    const source = body?.source as string | undefined;

    if (!event || !ALLOWED_EVENTS.includes(event as DevflowFunnelEventName)) {
      return NextResponse.json(
        { success: false, error: "Evento inválido ou não permitido" },
        { status: 400 }
      );
    }

    trackFunnelEvent(event as DevflowFunnelEventName, {
      sessionId,
      userId,
      householdId,
      source,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, error: "Erro ao registrar evento" },
      { status: 500 }
    );
  }
}
