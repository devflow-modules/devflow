/**
 * Definição central de planos e limites.
 * Backend-first: nunca confiar apenas no frontend.
 */

export type PlanKey = "FREE" | "PRO" | "SCALE";

export type SubscriptionStatus = "ACTIVE" | "TRIAL" | "PAST_DUE" | "CANCELED";

export type PlanLimits = {
  users: number | null;
  messagesPerMonth: number | null;
  automationsPerMonth: number | null;
  aiCallsPerMonth: number | null;
};

export type PlanFeatures = {
  AUTOMATION: boolean;
  PLAYBOOKS: boolean;
  AI_RESPONSE: boolean;
  ADVANCED_AI: boolean;
  MULTI_USER: boolean;
  PRIORITY_SUPPORT: boolean;
};

export type PlanDefinition = {
  key: PlanKey;
  name: string;
  limits: PlanLimits;
  features: PlanFeatures;
};

export const PLANS: Record<PlanKey, PlanDefinition> = {
  FREE: {
    key: "FREE",
    name: "Gratuito",
    limits: {
      users: 1,
      messagesPerMonth: 100,
      automationsPerMonth: 0,
      aiCallsPerMonth: 10,
    },
    features: {
      AUTOMATION: false,
      PLAYBOOKS: false,
      AI_RESPONSE: true,
      ADVANCED_AI: false,
      MULTI_USER: false,
      PRIORITY_SUPPORT: false,
    },
  },
  PRO: {
    key: "PRO",
    name: "Pro",
    limits: {
      users: 3,
      messagesPerMonth: 1_000,
      automationsPerMonth: 100,
      aiCallsPerMonth: 500,
    },
    features: {
      AUTOMATION: true,
      PLAYBOOKS: false,
      AI_RESPONSE: true,
      ADVANCED_AI: false,
      MULTI_USER: true,
      PRIORITY_SUPPORT: false,
    },
  },
  SCALE: {
    key: "SCALE",
    name: "Scale",
    limits: {
      users: null,
      messagesPerMonth: null,
      automationsPerMonth: null,
      aiCallsPerMonth: null,
    },
    features: {
      AUTOMATION: true,
      PLAYBOOKS: true,
      AI_RESPONSE: true,
      ADVANCED_AI: true,
      MULTI_USER: true,
      PRIORITY_SUPPORT: true,
    },
  },
};

export function normalizePlan(plan: string | null | undefined): PlanKey {
  const p = (plan ?? "FREE").toUpperCase();
  if (p === "STARTER") return "FREE";
  if (p === "PRO") return "PRO";
  if (p === "SCALE" || p === "TEAM") return "SCALE";
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
