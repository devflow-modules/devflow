/**
 * Planos efetivos: FREE (avaliação) + OPERATIONAL_BASE (implantação / operação contratada).
 * Valores legados na BD (STARTER, PRO, SCALE, TEAM, ENTERPRISE) normalizam para OPERATIONAL_BASE.
 */

export type PlanKey = "FREE" | "OPERATIONAL_BASE";

/** Plano único pago usado em checkout, Stripe metadata e políticas internas. */
export const COMMERCIAL_CONTRACT_PLAN_KEY = "operational_base" as const;

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
  FREE: {
    key: "FREE",
    name: "Avaliação",
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
  OPERATIONAL_BASE: {
    key: "OPERATIONAL_BASE",
    name: "Operação contratada",
    priceBrl: 0,
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

const PAID_ALIASES = new Set([
  "STARTER",
  "PRO",
  "SCALE",
  "TEAM",
  "ENTERPRISE",
  "OPERATIONAL_BASE",
  "OPERATIONAL-BASE",
  COMMERCIAL_CONTRACT_PLAN_KEY.toUpperCase(),
]);

export function normalizePlan(plan: string | null | undefined): PlanKey {
  const p = (plan ?? "FREE").toUpperCase().replace(/-/g, "_");
  if (p === "FREE") return "FREE";
  if (PAID_ALIASES.has(p)) return "OPERATIONAL_BASE";
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

export function planAllowsMeteredOverage(plan: string | null | undefined): boolean {
  return normalizePlan(plan) !== "FREE";
}
