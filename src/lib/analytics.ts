/**
 * Tracking de eventos — Vercel Analytics + Meta Pixel
 */

import { track } from "@vercel/analytics";
import { trackMetaContact } from "./meta-pixel";

export function trackCtaWhatsAppClick(source?: string): void {
  track("cta_whatsapp_click", { source: source ?? "unknown" });
  trackMetaContact();
}

export function trackCtaDemoClick(source?: string): void {
  track("cta_demo_click", { source: source ?? "unknown" });
}

export function trackCtaScroll50(): void {
  track("cta_scroll_50");
}

/** Profundidade de scroll na home (25% / 50% / 75%) */
export function trackScrollDepth(percent: 25 | 50 | 75): void {
  track(`scroll_depth_${percent}`, { page: "home" });
}

/** CTAs da home — conversão */
export function trackHomeCta(
  action:
    | "hero_tools"
    | "hero_whatsapp"
    | "hero_how_it_works"
    | "hub_pillar_tools"
    | "hub_pillar_products"
    | "hub_pillar_automation"
): void {
  track("home_cta_click", { action });
}

/** Clique em card de ferramenta (home) */
export function trackToolCardClick(toolId: string): void {
  track("tool_card_click", { tool: toolId, page: "home" });
}

/** Cross-sell em páginas de ferramentas */
export function trackCrossSell(target: "financeiro" | "whatsapp" | "produtos"): void {
  track("cross_sell_click", { target });
}
