import { describe, expect, it } from "vitest";
import {
  normalizeOperationalStatus,
  operationalStatusDotClass,
  OPERATIONAL_STATUS_LABEL,
} from "../agentOperationalStatus";

describe("agentOperationalStatus", () => {
  it("normaliza presença operacional", () => {
    expect(normalizeOperationalStatus("available")).toBe("available");
    expect(normalizeOperationalStatus("BUSY")).toBe("busy");
    expect(normalizeOperationalStatus(null)).toBe("offline");
    expect(normalizeOperationalStatus("unknown")).toBe("offline");
  });

  it("mapeia dots para classes df-status-dot semânticas", () => {
    expect(operationalStatusDotClass("available")).toBe("df-status-dot--ok");
    expect(operationalStatusDotClass("busy")).toBe("df-status-dot--busy");
    expect(operationalStatusDotClass("offline")).toBe("df-status-dot--muted");
  });

  it("mantém labels de operação", () => {
    expect(OPERATIONAL_STATUS_LABEL.available).toBe("Livre");
    expect(OPERATIONAL_STATUS_LABEL.busy).toBe("Em atendimento");
    expect(OPERATIONAL_STATUS_LABEL.offline).toBe("Offline");
  });
});
