import { describe, it, expect } from "vitest";
import {
  PLANS,
  getPlan,
  normalizePlan,
  getPlanLimits,
  getPlanFeatures,
} from "../plans";

describe("plans", () => {
  it("FREE tem limite de 1 usuário e 100 mensagens", () => {
    const free = PLANS.FREE;
    expect(free.limits.users).toBe(1);
    expect(free.limits.messagesPerMonth).toBe(100);
    expect(free.limits.automationsPerMonth).toBe(0);
  });

  it("PRO tem 3 usuários e 1000 mensagens", () => {
    const pro = PLANS.PRO;
    expect(pro.limits.users).toBe(3);
    expect(pro.limits.messagesPerMonth).toBe(1000);
    expect(pro.features.AUTOMATION).toBe(true);
    expect(pro.features.PLAYBOOKS).toBe(false);
  });

  it("SCALE tem limites null (ilimitado)", () => {
    const scale = PLANS.SCALE;
    expect(scale.limits.users).toBeNull();
    expect(scale.limits.messagesPerMonth).toBeNull();
    expect(scale.features.AUTOMATION).toBe(true);
    expect(scale.features.PLAYBOOKS).toBe(true);
  });

  it("normalizePlan mapeia TEAM para SCALE", () => {
    expect(normalizePlan("TEAM")).toBe("SCALE");
    expect(normalizePlan("team")).toBe("SCALE");
  });

  it("normalizePlan mapeia STARTER para FREE", () => {
    expect(normalizePlan("STARTER")).toBe("FREE");
  });

  it("getPlan retorna definição correta", () => {
    expect(getPlan("PRO").key).toBe("PRO");
    expect(getPlan(null).key).toBe("FREE");
  });

  it("getPlanLimits retorna limites do plano", () => {
    expect(getPlanLimits("FREE").messagesPerMonth).toBe(100);
    expect(getPlanLimits("PRO").messagesPerMonth).toBe(1000);
  });

  it("getPlanFeatures retorna features do plano", () => {
    expect(getPlanFeatures("FREE").AUTOMATION).toBe(false);
    expect(getPlanFeatures("PRO").AUTOMATION).toBe(true);
    expect(getPlanFeatures("SCALE").ADVANCED_AI).toBe(true);
  });
});
