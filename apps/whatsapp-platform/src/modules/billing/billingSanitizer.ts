/**
 * Respostas de API de billing em WHITE_LABEL: não expor plano, preços, Stripe,
 * limites numéricos nem metering a utilizadores que não sejam staff (platform_admin).
 * A lógica interna (serviços, Stripe, tracking) mantém-se inalterada — só o payload HTTP é filtrado.
 */

import { NextResponse } from "next/server";
import { logBillingInternalDebug } from "@/lib/serverVerboseLog";
import type { SubscriptionView, UsageDashboard } from "./billingService";
import type { TenantBillingUI } from "./tenantBillingUIService";

export function isWhiteLabelBillingApi(): boolean {
  return process.env.NEXT_PUBLIC_PRODUCT_MODE === "WHITE_LABEL";
}

/** Acesso completo aos dados de billing na API (inclui respostas em WL). */
export function isBillingFullAccessUser(user: { role?: string } | null | undefined): boolean {
  const r = user?.role;
  return r === "platform_admin" || r === "admin";
}

export function shouldSanitizeBillingResponse(user: { role?: string } | null | undefined): boolean {
  return isWhiteLabelBillingApi() && !isBillingFullAccessUser(user);
}

/** Log só no servidor — nunca enviar este objeto ao cliente. Ative com `BILLING_INTERNAL_LOG=1`. */
export function logBillingInternal(route: string, tenantId: string | undefined, raw: unknown): void {
  logBillingInternalDebug(route, tenantId, raw);
}

export type SanitizedSubscriptionView = Pick<SubscriptionView, "status" | "cancelAtPeriodEnd">;

export function sanitizeSubscriptionView(raw: SubscriptionView, user: { role?: string }): SubscriptionView | SanitizedSubscriptionView {
  if (!shouldSanitizeBillingResponse(user)) return raw;
  return {
    status: raw.status,
    cancelAtPeriodEnd: raw.cancelAtPeriodEnd,
  };
}

/** Sem contagens, preços, limites nem Stripe — só sinalização operacional mínima. */
export type SanitizedUsageDashboard = Pick<UsageDashboard, "period" | "withinLimits" | "enforceLimits">;

export function sanitizeUsageDashboard(raw: UsageDashboard, user: { role?: string }): UsageDashboard | SanitizedUsageDashboard {
  if (!shouldSanitizeBillingResponse(user)) return raw;
  return {
    period: raw.period,
    withinLimits: raw.withinLimits,
    enforceLimits: raw.enforceLimits,
  };
}

export type SanitizedTenantBillingUI = Record<string, never>;

export function sanitizeTenantBillingUI(raw: TenantBillingUI, user: { role?: string }): TenantBillingUI | SanitizedTenantBillingUI {
  if (!shouldSanitizeBillingResponse(user)) return raw;
  return {};
}

export type AiPlanClientPayload = {
  plan: string;
  plan_name: string;
  ai_limit: number | null;
  ai_limit_label: string;
};

export function sanitizeAiPlanPayload(raw: AiPlanClientPayload, user: { role?: string }): AiPlanClientPayload | Record<string, never> {
  if (!shouldSanitizeBillingResponse(user)) return raw;
  return {};
}

/** Estado mínimo para gating de IA sem expor limites, plano ou custos. */
export type SanitizedAiUsageStatusPayload = {
  can_use: boolean;
  should_fallback_to_legacy: boolean;
  period: string;
};

export type AiUsageStatusClientPayload = {
  used: number;
  limit: number | null;
  percent_used: number | null;
  can_use: boolean;
  should_fallback_to_legacy: boolean;
  period: string;
  plan: string;
  ai_overage_billed?: number;
  ai_overage_cost_brl?: number;
};

export function sanitizeAiUsageStatusPayload(
  raw: AiUsageStatusClientPayload,
  user: { role?: string }
): AiUsageStatusClientPayload | SanitizedAiUsageStatusPayload {
  if (!shouldSanitizeBillingResponse(user)) return raw;
  return {
    can_use: raw.can_use,
    should_fallback_to_legacy: raw.should_fallback_to_legacy,
    period: raw.period,
  };
}

/** GET /api/tenants/me — não expor colunas de plano comercial / vigência contratual. */
export function sanitizeTenantMeGetPayload<T extends Record<string, unknown>>(data: T, user: { role?: string }): T {
  if (!shouldSanitizeBillingResponse(user)) return data;
  const rest = { ...data };
  delete rest.plan;
  delete rest.activeUntil;
  return rest as T;
}

/** GET /api/ai/usage — métricas operacionais sem tokens nem custo estimado. */
export type AiUsageRouteMetrics = {
  messages_total: number;
  ai_messages_total: number;
  fallback_total: number;
  tokens_used_total: number;
  estimated_cost_usd: number;
};

export type SanitizedAiUsageRouteMetrics = Pick<
  AiUsageRouteMetrics,
  "messages_total" | "ai_messages_total" | "fallback_total"
>;

export function sanitizeAiUsageRouteMetrics(
  raw: AiUsageRouteMetrics,
  user: { role?: string }
): AiUsageRouteMetrics | SanitizedAiUsageRouteMetrics {
  if (!shouldSanitizeBillingResponse(user)) return raw;
  return {
    messages_total: raw.messages_total,
    ai_messages_total: raw.ai_messages_total,
    fallback_total: raw.fallback_total,
  };
}

/** Erro 402 de limite de uso — sem plano nem upgrade no JSON. */
export type UsageLimitErrorPayload = {
  message: string;
  code: string;
  currentPlan: string;
  upgradeRequired: boolean;
  feature: string;
};

export type SanitizedUsageLimitErrorPayload = Pick<UsageLimitErrorPayload, "message" | "code" | "feature">;

export function sanitizeUsageLimitErrorPayload(
  raw: UsageLimitErrorPayload,
  user: { role?: string }
): UsageLimitErrorPayload | SanitizedUsageLimitErrorPayload {
  if (!shouldSanitizeBillingResponse(user)) return raw;
  const base =
    raw.feature === "messages"
      ? "A capacidade de envio para este período foi atingida. Contacte o suporte para alinhar a operação."
      : "A capacidade de IA para este período foi atingida. Contacte o suporte para alinhar a operação.";
  return {
    message: base,
    code: raw.code,
    feature: raw.feature,
  };
}

/** 403 FEATURE_NOT_AVAILABLE — sem nomes de plano nem «upgrade». */
export type FeatureNotAvailablePayloadShape = {
  success: false;
  code: "FEATURE_NOT_AVAILABLE";
  feature: string;
  currentPlan: string;
  requiredPlan: string;
  message: string;
};

export type SanitizedFeatureNotAvailablePayload = {
  success: false;
  code: "FEATURE_NOT_AVAILABLE";
  feature: string;
  message: string;
};

export function sanitizeFeatureNotAvailablePayload(
  raw: FeatureNotAvailablePayloadShape,
  user: { role?: string }
): FeatureNotAvailablePayloadShape | SanitizedFeatureNotAvailablePayload {
  if (!shouldSanitizeBillingResponse(user)) return raw;
  return {
    success: false,
    code: "FEATURE_NOT_AVAILABLE",
    feature: raw.feature,
    message:
      "Esta capacidade não está ativa na configuração atual da operação. Contacte o suporte para pedir alterações.",
  };
}

/** Checkout, portal Stripe e upgrade não estão disponíveis a tenants em WHITE_LABEL (só staff vê URLs/dados completos). */
export function billingWriteForbiddenResponse(): NextResponse {
  return NextResponse.json(
    { success: false, error: "Indisponível neste modo de produto." },
    { status: 403 }
  );
}

/**
 * Contrato genérico (legado) — remove chaves sensíveis no primeiro nível e em `data` aninhado.
 * Preferir sempre as funções tipadas acima nas rotas de billing.
 */
export function sanitizeBillingData(data: Record<string, unknown>, user: { role?: string } | null | undefined): Record<string, unknown> {
  if (!isWhiteLabelBillingApi() || isBillingFullAccessUser(user)) return data;

  const BILLING_KEYS_TO_STRIP = [
    "plan",
    "planName",
    "plan_name",
    "price",
    "amount",
    "stripeCustomerId",
    "stripeSubscriptionId",
    "subscriptionStatus",
    "customerId",
    "subscriptionId",
    "invoice",
    "invoiceId",
    "usageLimit",
    "usageLimits",
    "meteredUsage",
    "overage",
  ] as const;

  const strip = (obj: Record<string, unknown>): Record<string, unknown> => {
    const rest = { ...obj };
    for (const k of BILLING_KEYS_TO_STRIP) {
      delete rest[k];
    }
    return rest;
  };

  const top = strip({ ...data });
  if (top.data && typeof top.data === "object" && top.data !== null && !Array.isArray(top.data)) {
    return { ...top, data: strip({ ...(top.data as Record<string, unknown>) }) };
  }
  return top;
}
