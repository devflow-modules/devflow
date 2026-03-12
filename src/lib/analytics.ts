/**
 * Tracking de eventos — Vercel Analytics + Meta Pixel
 * Eventos: cta_whatsapp_click, cta_demo_click, cta_scroll_50
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
