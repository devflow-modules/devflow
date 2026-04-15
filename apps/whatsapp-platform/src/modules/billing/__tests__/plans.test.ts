import { describe, it, expect } from "vitest";
import {
  PLANS,
  getPlan,
  normalizePlan,
  getPlanLimits,
  getPlanFeatures,
  planAllowsMeteredOverage,
} from "../plans";
import { getTenantPlanCapabilities } from "../planCapabilities";

describe("plans", () => {
  it("FREE tem limite restritivo (fallback sem assinatura)", () => {
    const free = PLANS.FREE;
    expect(free.limits.users).toBe(1);
    expect(free.limits.messagesPerMonth).toBe(50);
    expect(free.limits.automationsPerMonth).toBe(0);
    expect(free.priceBrl).toBe(0);
  });

  it("OPERATIONAL_BASE tem limites amplos e todas as features", () => {
    const op = PLANS.OPERATIONAL_BASE;
    expect(op.limits.users).toBe(10);
    expect(op.limits.messagesPerMonth).toBe(20_000);
    expect(op.limits.aiCallsPerMonth).toBe(3000);
    expect(op.features.AUTOMATION).toBe(true);
    expect(op.features.ADVANCED_AUTOMATION).toBe(true);
    expect(op.features.ADVANCED_AI).toBe(true);
    expect(op.features.WEBHOOKS_API).toBe(true);
  });

  it("normalizePlan mapeia legados pagos para OPERATIONAL_BASE", () => {
    expect(normalizePlan("TEAM")).toBe("OPERATIONAL_BASE");
    expect(normalizePlan("team")).toBe("OPERATIONAL_BASE");
    expect(normalizePlan("STARTER")).toBe("OPERATIONAL_BASE");
    expect(normalizePlan("PRO")).toBe("OPERATIONAL_BASE");
    expect(normalizePlan("SCALE")).toBe("OPERATIONAL_BASE");
    expect(normalizePlan("OPERATIONAL_BASE")).toBe("OPERATIONAL_BASE");
    expect(normalizePlan("operational_base")).toBe("OPERATIONAL_BASE");
  });

  it("normalizePlan FREE", () => {
    expect(normalizePlan("FREE")).toBe("FREE");
    expect(normalizePlan(null)).toBe("FREE");
  });

  it("getPlan retorna definição correta", () => {
    expect(getPlan("PRO").key).toBe("OPERATIONAL_BASE");
    expect(getPlan("STARTER").key).toBe("OPERATIONAL_BASE");
    expect(getPlan(null).key).toBe("FREE");
  });

  it("getPlanLimits retorna limites do plano", () => {
    expect(getPlanLimits("FREE").messagesPerMonth).toBe(50);
    expect(getPlanLimits("PRO").messagesPerMonth).toBe(20_000);
    expect(getPlanLimits("SCALE").messagesPerMonth).toBe(20_000);
  });

  it("getPlanFeatures retorna features do plano", () => {
    expect(getPlanFeatures("FREE").AUTOMATION).toBe(false);
    expect(getPlanFeatures("PRO").AUTOMATION).toBe(true);
    expect(getPlanFeatures("SCALE").ADVANCED_AI).toBe(true);
  });

  it("planAllowsMeteredOverage: false só para FREE", () => {
    expect(planAllowsMeteredOverage("FREE")).toBe(false);
    expect(planAllowsMeteredOverage("STARTER")).toBe(true);
    expect(planAllowsMeteredOverage("PRO")).toBe(true);
    expect(planAllowsMeteredOverage("OPERATIONAL_BASE")).toBe(true);
  });

  it("getTenantPlanCapabilities retorna maxMessages, maxAIUsage e featuresEnabled", () => {
    const free = getTenantPlanCapabilities("FREE");
    expect(free.plan).toBe("FREE");
    expect(free.maxMessages).toBe(50);
    expect(free.maxAIUsage).toBe(10);
    expect(free.featuresEnabled.AUTOMATION).toBe(false);

    const op = getTenantPlanCapabilities("PRO");
    expect(op.plan).toBe("OPERATIONAL_BASE");
    expect(op.maxMessages).toBe(20_000);
    expect(op.maxAIUsage).toBe(3000);
    expect(op.featuresEnabled.ADVANCED_AUTOMATION).toBe(true);
  });
});
