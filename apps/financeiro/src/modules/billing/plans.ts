/**
 * Definição de planos de monetização do produto.
 * Opt-in e isolado; sem alterar comportamento atual.
 */

export type PlanId = "FREE" | "PRO" | "TEAM";

export type PlanFeatures = {
  advancedRules: boolean;
  exports: boolean;
  analytics: boolean;
};

export type PlanDefinition = {
  name: PlanId;
  maxHouseholds: number;
  maxRules: number;
  features: PlanFeatures;
};

export const Plans: Record<PlanId, PlanDefinition> = {
  FREE: {
    name: "FREE",
    maxHouseholds: 1,
    maxRules: 3,
    features: {
      advancedRules: false,
      exports: false,
      analytics: false,
    },
  },
  PRO: {
    name: "PRO",
    maxHouseholds: 5,
    maxRules: 50,
    features: {
      advancedRules: true,
      exports: true,
      analytics: true,
    },
  },
  TEAM: {
    name: "TEAM",
    maxHouseholds: 20,
    maxRules: 500,
    features: {
      advancedRules: true,
      exports: true,
      analytics: true,
    },
  },
};

export type FeatureName = keyof PlanFeatures;

export type LimitType = "households" | "rules";
