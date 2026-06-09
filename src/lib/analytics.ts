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

/** CTAs do funil WhatsApp Platform — home, demo, contato, header, footer. */
export function trackFunnelCtaClick(props: {
  cta: "agendar_diagnostico" | "ver_demo_guiada" | "falar_whatsapp";
  surface: string;
}): void {
  track("funnel_cta_click", props);
}

/** Etapas do fluxo guiado em `/demo`. */
export function trackDemoGuidedStep(props: {
  step: number;
  stepTitle: string;
  action: "tab" | "next" | "prev";
}): void {
  track("demo_guided_step", props);
}

/** Envio do formulário de diagnóstico em `/contato`. */
export function trackDiagnosticoFormSubmit(props: {
  hasVolume: boolean;
  hasProblema: boolean;
}): void {
  track("diagnostico_form_submit", props);
}

/** Links secundários do ecossistema (header, footer, home). */
export function trackEcosystemLinkClick(props: { item: string; surface: string }): void {
  track("ecosystem_link_click", props);
}

/** Footer — navegação por seção. */
export function trackFooterLinkClick(props: {
  item: string;
  section: "funnel" | "ecossistema" | "segmentos" | "empresa" | "legal";
}): void {
  track("footer_link_click", props);
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
    | "hero_agendar_diagnostico"
    | "hero_ver_demo"
    | "hero_tools"
    | "hero_whatsapp"
    | "hero_whatsapp_platform"
    | "hero_how_it_works"
    | "hero_produtos_hub"
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

/** Header global — navegação e conversão */
export function trackHeaderNavClicked(props: { item: string; surface?: string }): void {
  track("header_nav_clicked", {
    item: props.item,
    surface: props.surface ?? "desktop",
  });
}

export function trackHeaderCtaClicked(props: {
  cta: "agendar_diagnostico" | "ver_demo" | "começar_grátis" | "entrar";
  surface?: string;
}): void {
  track("header_cta_clicked", {
    cta: props.cta,
    surface: props.surface ?? "desktop",
  });
}

export function trackHeaderDemoClicked(props: { surface?: string } = {}): void {
  track("header_demo_clicked", { surface: props.surface ?? "header" });
}

export function trackHeaderProductsOpened(props: { surface?: string } = {}): void {
  track("header_products_opened", { surface: props.surface ?? "header_desktop" });
}

/** Hub multiproduto — dropdown, /produtos e “Como escolher” */
export function trackProductsDropdownItemClicked(props: {
  productId: string;
  targetHref: string;
  surface?: string;
}): void {
  track("products_dropdown_item_clicked", {
    product_id: props.productId,
    target_href: props.targetHref,
    surface: props.surface ?? "desktop",
  });
}

export function trackProductsPageCardClicked(props: {
  productId: string;
  targetHref: string;
}): void {
  track("products_page_card_clicked", {
    product_id: props.productId,
    target_href: props.targetHref,
  });
}

export function trackProductsPageCtaClicked(props: {
  productId: string;
  cta: "começar_gratis" | "ver_exemplo" | "abrir";
  targetHref: string;
}): void {
  track("products_page_cta_clicked", {
    product_id: props.productId,
    cta: props.cta,
    target_href: props.targetHref,
  });
}

export function trackProductsSelectionHelpUsed(props: { surface?: string } = {}): void {
  track("products_selection_help_used", { surface: props.surface ?? "products_page" });
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

/** Navegação Financeiro — usuário autenticado em entrada pública (ex.: ?stay=1) */
export type FinanceiroNavAnalyticsBase = {
  source_path: string;
  target_path: string;
  has_last_route: boolean;
  redirect_type?: string;
};

export function trackFinanceiroReturnDetected(props: FinanceiroNavAnalyticsBase): void {
  track("financeiro_return_detected", props);
}

export function trackFinanceiroAutoRedirected(props: FinanceiroNavAnalyticsBase): void {
  track("financeiro_auto_redirected", props);
}

export function trackFinanceiroResumeLastRoute(
  props: FinanceiroNavAnalyticsBase & { interaction: "auto" | "cta_click" }
): void {
  track("financeiro_resume_last_route", props);
}

export function trackFinanceiroGoToDashboardClicked(
  props: Pick<FinanceiroNavAnalyticsBase, "source_path" | "target_path" | "has_last_route"> & {
    surface?: string;
  }
): void {
  track("financeiro_go_to_dashboard_clicked", {
    source_path: props.source_path,
    target_path: props.target_path,
    has_last_route: props.has_last_route,
    surface: props.surface ?? "unknown",
  });
}

/** Painel operacional do dashboard — ações rápidas */
export function trackFinanceiroQuickActionClicked(props: {
  action_type: string;
  source: "dashboard" | "sidebar" | "mobile" | "fab";
  position?: number;
  has_last_action?: boolean;
  target_path: string;
}): void {
  track("financeiro_quick_action_clicked", {
    action_type: props.action_type,
    source: props.source,
    position: props.position ?? -1,
    has_last_action: props.has_last_action ?? false,
    target_path: props.target_path,
  });
}

export function trackFinanceiroResumeClicked(props: {
  action_type?: string;
  source: "dashboard" | "sidebar" | "mobile" | "fab";
  has_last_action: boolean;
  target_path: string;
}): void {
  track("financeiro_resume_clicked", {
    action_type: props.action_type ?? "last_action",
    source: props.source,
    has_last_action: props.has_last_action,
    target_path: props.target_path,
  });
}

export function trackFinanceiroRecentAccessClicked(props: {
  source: "dashboard" | "sidebar" | "mobile" | "fab";
  position: number;
  target_path: string;
}): void {
  track("financeiro_recent_access_clicked", {
    source: props.source,
    position: props.position,
    target_path: props.target_path,
  });
}

/** Dashboard inteligente — insights de prioridade */
export function trackFinanceiroInsightViewed(props: {
  insight_type: string;
  insight_id: string;
  priority: number;
  cta_target: string;
  position?: number;
}): void {
  track("financeiro_insight_viewed", {
    insight_type: props.insight_type,
    insight_id: props.insight_id,
    priority: props.priority,
    cta_target: props.cta_target,
    position: props.position ?? -1,
  });
}

export function trackFinanceiroInsightClicked(props: {
  insight_type: string;
  insight_id: string;
  priority: number;
  cta_target: string;
  position?: number;
}): void {
  track("financeiro_insight_clicked", {
    insight_type: props.insight_type,
    insight_id: props.insight_id,
    priority: props.priority,
    cta_target: props.cta_target,
    position: props.position ?? -1,
  });
}

/** Rotina mensal — checklist do mês */
export function trackFinanceiroTaskViewed(props: {
  task_id: string;
  completed: boolean;
  progress: number;
  position: number;
}): void {
  track("financeiro_task_viewed", {
    task_id: props.task_id,
    completed: props.completed,
    progress: props.progress,
    position: props.position,
  });
}

export function trackFinanceiroTaskClicked(props: {
  task_id: string;
  completed: boolean;
  progress: number;
  position: number;
}): void {
  track("financeiro_task_clicked", {
    task_id: props.task_id,
    completed: props.completed,
    progress: props.progress,
    position: props.position,
  });
}

export function trackFinanceiroTaskCompleted(props: {
  task_id: string;
  progress: number;
  position: number;
}): void {
  track("financeiro_task_completed", {
    task_id: props.task_id,
    completed: true,
    progress: props.progress,
    position: props.position,
  });
}

/** Score de saúde financeira — visão geral do mês */
export function trackFinanceiroScoreViewed(props: {
  score: number;
  level: string;
  lowest_factor: string;
  highest_factor: string;
}): void {
  track("financeiro_score_viewed", {
    score: props.score,
    level: props.level,
    lowest_factor: props.lowest_factor,
    highest_factor: props.highest_factor,
  });
}

export function trackFinanceiroScoreBreakdownClicked(props: {
  score: number;
  level: string;
  lowest_factor: string;
  highest_factor: string;
  criterion_id: string;
}): void {
  track("financeiro_score_breakdown_clicked", {
    score: props.score,
    level: props.level,
    lowest_factor: props.lowest_factor,
    highest_factor: props.highest_factor,
    criterion_id: props.criterion_id,
  });
}

/** Mobile dashboard — expansão além do resumo (eficácia do polish) */
export function trackFinanceiroMobileExpandScoreBreakdown(): void {
  track("financeiro_mobile_expand_score_breakdown", {});
}

export function trackFinanceiroMobileExpandInsights(props: { hidden_count: number }): void {
  track("financeiro_mobile_expand_insights", { hidden_count: props.hidden_count });
}

export function trackFinanceiroMobileExpandChecklist(props: { hidden_count: number }): void {
  track("financeiro_mobile_expand_checklist", { hidden_count: props.hidden_count });
}

/** Onboarding in-product — ativação sem tutorial externo */
export function trackFinanceiroOnboardingStarted(props: { surface?: string } = {}): void {
  track("financeiro_onboarding_started", { surface: props.surface ?? "dashboard" });
}

export function trackFinanceiroOnboardingStepCompleted(props: {
  step: "income" | "expense";
  surface?: string;
}): void {
  track("financeiro_onboarding_step_completed", {
    step: props.step,
    surface: props.surface ?? "expenses_page",
  });
}

export function trackFinanceiroOnboardingCompleted(props: { surface?: string } = {}): void {
  track("financeiro_onboarding_completed", { surface: props.surface ?? "dashboard" });
}

/**
 * CTA que leva ao demo do Financeiro no portal (redirect server-side para o app).
 * Disparar no clique, antes da navegação.
 */
export function trackFinanceiroDemoEntryClick(props: {
  surface: string;
  target_href?: string;
}): void {
  track("financeiro_demo_entry_click", {
    surface: props.surface,
    target_href: props.target_href ?? "",
  });
}

/** Demo pública do Financeiro (sem autenticação) */
export function trackFinanceiroDemoOpened(props: { surface?: string } = {}): void {
  track("financeiro_demo_opened", {
    surface: props.surface ?? "direct",
    mode: "demo",
  });
}

export function trackFinanceiroDemoConvertedToSignup(props: {
  cta: string;
  surface?: string;
}): void {
  track("financeiro_demo_converted_to_signup", {
    cta: props.cta,
    surface: props.surface ?? "demo_page",
    mode: "demo",
  });
}

/** Retenção emocional — dashboard */
export function trackFinanceiroUrgencyViewed(props: {
  kind: "stale" | "today_missing" | "incomplete";
  pending_count?: number;
}): void {
  track("financeiro_urgency_viewed", {
    kind: props.kind,
    pending_count: props.pending_count ?? 0,
  });
}

export function trackFinanceiroDailyGoalViewed(props: { completed: boolean; calendar_day: string }): void {
  track("financeiro_daily_goal_viewed", {
    completed: props.completed,
    calendar_day: props.calendar_day,
  });
}

export function trackFinanceiroDailyGoalCompleted(props: { calendar_day: string }): void {
  track("financeiro_daily_goal_completed", { calendar_day: props.calendar_day });
}

export function trackFinanceiroScoreImproved(props: {
  from_score: number;
  to_score: number;
  delta: number;
}): void {
  track("financeiro_score_improved", {
    from_score: props.from_score,
    to_score: props.to_score,
    delta: props.delta,
  });
}

export function trackFinanceiroScoreDeclined(props: {
  from_score: number;
  to_score: number;
  delta: number;
}): void {
  track("financeiro_score_declined", {
    from_score: props.from_score,
    to_score: props.to_score,
    delta: props.delta,
  });
}

export function trackFinanceiroReturnNextDay(props: { calendar_day: string }): void {
  track("financeiro_return_next_day", { calendar_day: props.calendar_day });
}
