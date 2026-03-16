"use client";

import { track } from "@vercel/analytics";

/**
 * Envia visitor_landed para o site (marketing). Uso completo do funil fica nos apps de produto.
 */
export function trackVisitorLanded(): void {
  track("devflow.funnel.visitor_landed");
}
