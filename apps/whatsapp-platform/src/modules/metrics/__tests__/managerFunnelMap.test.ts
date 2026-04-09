import { describe, it, expect } from "vitest";
import {
  funnelStageFromTagName,
  pickHighestFunnelStage,
  FUNNEL_STAGE_RANK,
} from "../managerFunnelMap";

describe("funnelStageFromTagName", () => {
  it("resolve aliases PT/EN", () => {
    expect(funnelStageFromTagName("Lead")).toBe("lead");
    expect(funnelStageFromTagName("Qualificado")).toBe("qualified");
    expect(funnelStageFromTagName("proposta")).toBe("proposal");
    expect(funnelStageFromTagName("Follow-up")).toBe("followUp");
    expect(funnelStageFromTagName("Perdido")).toBe("lost");
  });

  it("retorna null para tag irrelevante", () => {
    expect(funnelStageFromTagName("VIP")).toBeNull();
  });
});

describe("pickHighestFunnelStage", () => {
  it("escolhe estágio mais avançado", () => {
    expect(pickHighestFunnelStage(["Lead", "Proposta"])).toBe("proposal");
    expect(pickHighestFunnelStage(["Perdido", "Lead"])).toBe("lost");
  });

  it("FUNNEL_STAGE_RANK é crescente", () => {
    expect(FUNNEL_STAGE_RANK.lead).toBeLessThan(FUNNEL_STAGE_RANK.closed);
  });
});
