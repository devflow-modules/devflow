import { describe, expect, it } from "vitest";
import { DASHBOARD_AI_FUNNEL_STAGES } from "../dashboardAiFunnelCopy";

describe("DASHBOARD_AI_FUNNEL_STAGES (F3 copy PT)", () => {
  it("expõe estágios em português sem rótulos EN residual", () => {
    const labels = DASHBOARD_AI_FUNNEL_STAGES.map((s) => s.label);
    expect(labels).toEqual(["Lead", "Qualificação", "Negociação", "Suporte", "Fechado"]);
    expect(labels.some((l) => /Qualifying|Negotiating|Closed|Support/i.test(l) && l !== "Lead")).toBe(
      false
    );
    // "Support"/"Closed" EN não devem aparecer
    expect(labels).not.toContain("Qualifying");
    expect(labels).not.toContain("Negotiating");
    expect(labels).not.toContain("Closed");
    expect(labels).not.toContain("Support");
  });
});
