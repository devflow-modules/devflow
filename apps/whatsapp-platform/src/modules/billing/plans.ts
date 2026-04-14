/**
 * Definição central de planos, limites e flags de funcionalidade (fonte de verdade para enforcement e UI técnica).
 * Nunca confiar apenas no frontend para autorização.
 *
 * Assinatura mensal + possível uso variável (excedente) — ver serviços de billing e Stripe.
 *
 * Narrativa comercial, packaging e comparação por valor de produto: `planPresentation.ts` e
 * `docs/billing/PRODUCT_PRICING_NARRATIVE.md` (não duplicar números de quota na copy sem alinhar aqui).
 */

export type PlanKey = "FREE" | "STARTER" | "PRO" | "SCALE";

export type SubscriptionStatus = "ACTIVE" | "TRIAL" | "PAST_DUE" | "CANCELED";

export type PlanLimits = {
  phoneNumbers: number | null;
  users: number | null;
  messagesPerMonth: number | null;
  automationsPerMonth: number | null;
  aiCallsPerMonth: number | null;
};

export type PlanFeatures = {
  INBOX: boolean;
  AUTOMATION: boolean;
  QUEUES_TAGS: boolean;
  ADVANCED_AUTOMATION: boolean;
  AI_RESPONSE: boolean;
  ADVANCED_AI: boolean;
  WEBHOOKS_API: boolean;
  ADVANCED_REPORTS: boolean;
  MULTI_USER: boolean;
  PRIORITY_SUPPORT: boolean;
};

export type PlanDefinition = {
  key: PlanKey;
  name: string;
  priceBrl: number;
  limits: PlanLimits;
  features: PlanFeatures;
};

export const PLANS: Record<PlanKey, PlanDefinition> = {
  /** Fallback para tenant sem assinatura ativa (ex.: trial expirado, cancelado). */
  FREE: {
    key: "FREE",
    name: "Gratuito",
    priceBrl: 0,
    limits: {
      phoneNumbers: 1,
      users: 1,
      messagesPerMonth: 50,
      automationsPerMonth: 0,
      aiCallsPerMonth: 10,
    },
    features: {
      INBOX: true,
      AUTOMATION: false,
      QUEUES_TAGS: false,
      ADVANCED_AUTOMATION: false,
      AI_RESPONSE: true,
      ADVANCED_AI: false,
      WEBHOOKS_API: false,
      ADVANCED_REPORTS: false,
      MULTI_USER: false,
      PRIORITY_SUPPORT: false,
    },
  },
  STARTER: {
    key: "STARTER",
    name: "Starter",
    priceBrl: 39,
    limits: {
      phoneNumbers: 1,
      users: 1,
      messagesPerMonth: 1_000,
      automationsPerMonth: 5,
      aiCallsPerMonth: 100,
    },
    features: {
      INBOX: true,
      AUTOMATION: true,
      QUEUES_TAGS: false,
      ADVANCED_AUTOMATION: false,
      AI_RESPONSE: true,
      ADVANCED_AI: false,
      WEBHOOKS_API: false,
      ADVANCED_REPORTS: false,
      MULTI_USER: false,
      PRIORITY_SUPPORT: false,
    },
  },
  PRO: {
    key: "PRO",
    name: "Pro",
    priceBrl: 99,
    limits: {
      phoneNumbers: 1,
      users: 3,
      messagesPerMonth: 5_000,
      automationsPerMonth: 50,
      aiCallsPerMonth: 750,
    },
    features: {
      INBOX: true,
      AUTOMATION: true,
      QUEUES_TAGS: true,
      ADVANCED_AUTOMATION: true,
      AI_RESPONSE: true,
      ADVANCED_AI: false,
      WEBHOOKS_API: false,
      ADVANCED_REPORTS: true,
      MULTI_USER: true,
      PRIORITY_SUPPORT: false,
    },
  },
  SCALE: {
    key: "SCALE",
    name: "Scale",
    priceBrl: 249,
    limits: {
      phoneNumbers: 3,
      users: 10,
      messagesPerMonth: 20_000,
      automationsPerMonth: null,
      aiCallsPerMonth: 3_000,
    },
    features: {
      INBOX: true,
      AUTOMATION: true,
      QUEUES_TAGS: true,
      ADVANCED_AUTOMATION: true,
      AI_RESPONSE: true,
      ADVANCED_AI: true,
      WEBHOOKS_API: true,
      ADVANCED_REPORTS: true,
      MULTI_USER: true,
      PRIORITY_SUPPORT: true,
    },
  },
};

export function normalizePlan(plan: string | null | undefined): PlanKey {
  const p = (plan ?? "FREE").toUpperCase();
  if (p === "STARTER") return "STARTER";
  if (p === "PRO") return "PRO";
  if (p === "SCALE" || p === "TEAM") return "SCALE";
  if (p === "ENTERPRISE") return "SCALE"; // Enterprise sob consulta → trata como Scale
  return "FREE";
}

export function getPlan(plan: string | null | undefined): PlanDefinition {
  return PLANS[normalizePlan(plan)];
}

export function getPlanLimits(plan: string | null | undefined): PlanLimits {
  return getPlan(plan).limits;
}

export function getPlanFeatures(plan: string | null | undefined): PlanFeatures {
  return getPlan(plan).features;
}
