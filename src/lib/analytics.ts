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

/** Demo comercial /demo — fluxo guiado */
export function trackDemoScenarioSelected(scenario: string): void {
  track("demo_scenario_selected", { scenario });
}

export function trackDemoMessageSent(scenario: string, source: "chip" | "input"): void {
  track("demo_message_sent", { scenario, source });
}

export function trackDemoHandoff(scenario: string): void {
  track("demo_handoff", { scenario });
}

export function trackDemoCompleted(scenario: string): void {
  track("demo_completed", { scenario });
}

/** Billing — Vercel Analytics (cliente); use em CTAs e retorno pós-Stripe */
export function trackBillingCheckoutStarted(props: { planId: string; surface: string }): void {
  track("billing.checkout_started", props);
}

export function trackPricingPlanCtaClick(props: { planId: string; surface: string }): void {
  track("pricing.plan_cta_click", props);
}

export function trackUpgradeReturn(props: {
  status: "success" | "cancel";
  planId?: string | null;
}): void {
  track("billing.upgrade_return", props);
}

export function trackBillingPortalReturn(props: { surface?: string } = {}): void {
  track("billing.portal_return", props);
}

/** Demo visível em landing de produto (Investiga+, FunkLab, etc.) */
export type ProductDemoId = "investigamais" | "funklab";

export function trackOpenDemo(props: {
  product: ProductDemoId;
  surface?: string;
}): void {
  track("open_demo", { product: props.product, surface: props.surface ?? "unknown" });
}

/** CTA de conversão “experimentar produto” (app externo, ferramenta, trial) */
export function trackTryProduct(props: {
  product: ProductDemoId;
  surface?: string;
  destination?: string;
  /** Alinhado ao polish cross-produto: primário vs secundário na mesma superfície */
  cta_variant?: "primary" | "secondary";
}): void {
  track("try_product", {
    product: props.product,
    surface: props.surface ?? "unknown",
    destination: props.destination ?? "unknown",
    cta_variant: props.cta_variant ?? "primary",
  });
}
