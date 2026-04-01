import { describe, it, expect } from "vitest";
import { upgradeReturnStateFromSearchParams } from "../billingUiState";

describe("billingUiState", () => {
  it("detecta sucesso e cancelamento", () => {
    expect(upgradeReturnStateFromSearchParams({ success: "1" })).toBe("success");
    expect(upgradeReturnStateFromSearchParams({ cancel: "1" })).toBe("cancel");
    expect(upgradeReturnStateFromSearchParams({})).toBe("idle");
  });

  it("prioriza success sobre cancel se ambos presentes", () => {
    expect(upgradeReturnStateFromSearchParams({ success: "1", cancel: "1" })).toBe("success");
  });
});
