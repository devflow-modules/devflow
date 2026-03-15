"use client";

import { DEVFLOW_FUNNEL_EVENTS } from "@/analytics/devflowFunnelEvents";
import type { DevflowFunnelEventName } from "@/analytics/devflowFunnelEvents";

const SESSION_KEY = "devflow_growth_session_id";

function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID?.() ?? `s-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export function getGrowthSessionId(): string {
  return getOrCreateSessionId();
}

/**
 * Envia evento do funil para a API de growth (client-side).
 */
export async function trackGrowthEvent(
  event: DevflowFunnelEventName,
  options?: { source?: string; userId?: string; householdId?: string }
): Promise<void> {
  const sessionId = getOrCreateSessionId();
  try {
    await fetch("/api/analytics/growth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event,
        sessionId,
        source: options?.source,
        userId: options?.userId,
        householdId: options?.householdId,
      }),
    });
  } catch {
    // fire-and-forget; não quebrar a UX
  }
}

export const trackVisitorLanded = () =>
  trackGrowthEvent(DEVFLOW_FUNNEL_EVENTS.VISITOR_LANDED);
export const trackSimulatorUsed = () =>
  trackGrowthEvent(DEVFLOW_FUNNEL_EVENTS.SIMULATOR_USED);
export const trackSignupStartedClient = () =>
  trackGrowthEvent(DEVFLOW_FUNNEL_EVENTS.SIGNUP_STARTED);
export const trackSignupCompletedClient = (userId?: string) =>
  trackGrowthEvent(DEVFLOW_FUNNEL_EVENTS.SIGNUP_COMPLETED, { userId });
