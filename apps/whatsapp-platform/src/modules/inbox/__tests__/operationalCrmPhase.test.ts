import { describe, it, expect } from "vitest";
import {
  deriveOperationalCrmPhase,
  OPERATIONAL_CRM_PHASE_LABEL_PT,
} from "@/modules/inbox/leadCrm";

describe("deriveOperationalCrmPhase", () => {
  it("CLOSED → fechado", () => {
    expect(
      deriveOperationalCrmPhase({ threadStatus: "CLOSED", conversationState: "in_progress" })
    ).toBe("fechado");
  });

  it("awaiting_agent → novo", () => {
    expect(
      deriveOperationalCrmPhase({ threadStatus: "OPEN", conversationState: "awaiting_agent" })
    ).toBe("novo");
  });

  it("in_progress → em_contato", () => {
    expect(
      deriveOperationalCrmPhase({ threadStatus: "OPEN", conversationState: "in_progress" })
    ).toBe("em_contato");
  });

  it("awaiting_customer → follow_up", () => {
    expect(
      deriveOperationalCrmPhase({ threadStatus: "OPEN", conversationState: "awaiting_customer" })
    ).toBe("follow_up");
  });

  it("rótulos PT cobrem todas as fases", () => {
    const phases = ["novo", "em_contato", "follow_up", "fechado"] as const;
    for (const p of phases) {
      expect(OPERATIONAL_CRM_PHASE_LABEL_PT[p].length).toBeGreaterThan(3);
    }
  });
});
