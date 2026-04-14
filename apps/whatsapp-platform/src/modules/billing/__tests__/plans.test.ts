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

  it("STARTER tem 1 usuário, 1000 conversas, 100 IA", () => {
    const starter = PLANS.STARTER;
    expect(starter.limits.users).toBe(1);
    expect(starter.limits.messagesPerMonth).toBe(1000);
    expect(starter.limits.aiCallsPerMonth).toBe(100);
    expect(starter.priceBrl).toBe(39);
    expect(starter.features.AUTOMATION).toBe(true);
    expect(starter.features.ADVANCED_AUTOMATION).toBe(false);
  });

  it("PRO tem 3 usuários, 5000 conversas, 750 IA", () => {
    const pro = PLANS.PRO;
    expect(pro.limits.users).toBe(3);
    expect(pro.limits.messagesPerMonth).toBe(5000);
    expect(pro.limits.aiCallsPerMonth).toBe(750);
    expect(pro.priceBrl).toBe(99);
    expect(pro.features.AUTOMATION).toBe(true);
    expect(pro.features.ADVANCED_AUTOMATION).toBe(true);
    expect(pro.features.QUEUES_TAGS).toBe(true);
  });

  it("SCALE tem 10 usuários, 20000 conversas, 3000 IA", () => {
    const scale = PLANS.SCALE;
    expect(scale.limits.users).toBe(10);
    expect(scale.limits.messagesPerMonth).toBe(20000);
    expect(scale.limits.aiCallsPerMonth).toBe(3000);
    expect(scale.priceBrl).toBe(249);
    expect(scale.features.AUTOMATION).toBe(true);
    expect(scale.features.ADVANCED_AI).toBe(true);
    expect(scale.features.WEBHOOKS_API).toBe(true);
  });

  it("normalizePlan mapeia TEAM para SCALE", () => {
    expect(normalizePlan("TEAM")).toBe("SCALE");
    expect(normalizePlan("team")).toBe("SCALE");
  });

  it("normalizePlan mapeia STARTER para STARTER", () => {
    expect(normalizePlan("STARTER")).toBe("STARTER");
  });

  it("getPlan retorna definição correta", () => {
    expect(getPlan("PRO").key).toBe("PRO");
    expect(getPlan("STARTER").key).toBe("STARTER");
    expect(getPlan(null).key).toBe("FREE");
  });

  it("getPlanLimits retorna limites do plano", () => {
    expect(getPlanLimits("FREE").messagesPerMonth).toBe(50);
    expect(getPlanLimits("STARTER").messagesPerMonth).toBe(1000);
    expect(getPlanLimits("PRO").messagesPerMonth).toBe(5000);
    expect(getPlanLimits("SCALE").messagesPerMonth).toBe(20000);
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
    expect(planAllowsMeteredOverage("SCALE")).toBe(true);
  });

  it("getTenantPlanCapabilities retorna maxMessages, maxAIUsage e featuresEnabled", () => {
    const free = getTenantPlanCapabilities("FREE");
    expect(free.plan).toBe("FREE");
    expect(free.maxMessages).toBe(50);
    expect(free.maxAIUsage).toBe(10);
    expect(free.featuresEnabled.AUTOMATION).toBe(false);

    const pro = getTenantPlanCapabilities("PRO");
    expect(pro.plan).toBe("PRO");
    expect(pro.maxMessages).toBe(5000);
    expect(pro.maxAIUsage).toBe(750);
    expect(pro.featuresEnabled.ADVANCED_AUTOMATION).toBe(true);
  });
});
