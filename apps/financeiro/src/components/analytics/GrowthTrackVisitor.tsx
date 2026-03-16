"use client";

import { useEffect, useRef } from "react";
import { trackVisitorLanded } from "@/analytics/growth/trackClient";

/**
 * Dispara devflow.funnel.visitor_landed na primeira montagem (landing).
 * Colocar em páginas públicas de aquisição (ex.: /ferramentas/financeiro).
 */
export function GrowthTrackVisitor() {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    trackVisitorLanded();
  }, []);
  return null;
}
