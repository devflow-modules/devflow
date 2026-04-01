"use client";

import { useEffect, useRef } from "react";
import {
  trackFinanceiroAutoRedirected,
  trackFinanceiroResumeLastRoute,
} from "@/lib/analytics";
import { FINANCEIRO_NAV_EVENT_COOKIE } from "./constants";
import type { FinanceiroNavEventPayload } from "./navEventCookie";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));
  return match ? match[1] : null;
}

function clearCookie(name: string): void {
  document.cookie = `${name}=; path=/; max-age=0`;
}

function parseNavEvent(rawValue: string): FinanceiroNavEventPayload | null {
  try {
    const decoded = decodeURIComponent(rawValue);
    const o = JSON.parse(decoded) as unknown;
    if (!o || typeof o !== "object") return null;
    const p = o as Record<string, unknown>;
    if (
      typeof p.source_path !== "string" ||
      typeof p.target_path !== "string" ||
      typeof p.has_last_route !== "boolean" ||
      (p.redirect_type !== "from_landing" && p.redirect_type !== "from_auth")
    ) {
      return null;
    }
    return {
      source_path: p.source_path,
      target_path: p.target_path,
      has_last_route: p.has_last_route,
      redirect_type: p.redirect_type,
    };
  } catch {
    return null;
  }
}

/** Consome cookie definido no redirect server-side e dispara analytics no app autenticado. */
export function FinanceiroNavAnalyticsClient() {
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const raw = readCookie(FINANCEIRO_NAV_EVENT_COOKIE);
    if (!raw) return;

    const payload = parseNavEvent(raw);
    clearCookie(FINANCEIRO_NAV_EVENT_COOKIE);

    if (!payload) return;

    const base = {
      source_path: payload.source_path,
      target_path: payload.target_path,
      has_last_route: payload.has_last_route,
      redirect_type: payload.redirect_type,
    };

    trackFinanceiroAutoRedirected(base);
    if (payload.has_last_route) {
      trackFinanceiroResumeLastRoute({ ...base, interaction: "auto" });
    }
  }, []);

  return null;
}
