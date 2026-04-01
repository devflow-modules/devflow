import { describe, it, expect } from "vitest";
import {
  formatPlanLimitsSummary,
  planAudience,
  planCommercialRank,
  planPrimaryCtaLabel,
  planTagline,
} from "../pricingPresentation";

describe("pricingPresentation", () => {
  it("planTagline cobre FREE, PRO e TEAM", () => {
    expect(planTagline("FREE").length).toBeGreaterThan(10);
    expect(planTagline("PRO")).toContain("Operação");
    expect(planTagline("TEAM")).toContain("Famílias");
  });

  it("planPrimaryCtaLabel deixa o próximo passo explícito", () => {
    expect(planPrimaryCtaLabel("FREE")).toMatch(/grátis|Financeiro/i);
    expect(planPrimaryCtaLabel("PRO")).toMatch(/PRO|Stripe/i);
    expect(planPrimaryCtaLabel("TEAM")).toMatch(/TEAM|Stripe/i);
  });

  it("planCommercialRank favorece PRO como âncora", () => {
    expect(planCommercialRank("PRO")).toBeGreaterThan(planCommercialRank("TEAM"));
    expect(planCommercialRank("TEAM")).toBeGreaterThan(planCommercialRank("FREE"));
  });

  it("formatPlanLimitsSummary reflete Plans", () => {
    expect(formatPlanLimitsSummary("FREE")).toContain("1 casa");
    expect(formatPlanLimitsSummary("PRO")).toContain("5");
  });

  it("planAudience retorna texto não vazio", () => {
    expect(planAudience("FREE").length).toBeGreaterThan(5);
  });
});
