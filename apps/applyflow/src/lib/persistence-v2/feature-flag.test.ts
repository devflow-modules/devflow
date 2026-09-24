import { describe, expect, it } from "vitest";

import { isApplyFlowPersistenceV2Enabled } from "./feature-flag";

describe("isApplyFlowPersistenceV2Enabled", () => {
  it("defaults to OFF when unset", () => {
    expect(isApplyFlowPersistenceV2Enabled({})).toBe(false);
    expect(isApplyFlowPersistenceV2Enabled({ APPLYFLOW_PERSISTENCE_V2: "false" })).toBe(false);
  });

  it("is ON only for explicit true", () => {
    expect(isApplyFlowPersistenceV2Enabled({ APPLYFLOW_PERSISTENCE_V2: "true" })).toBe(true);
    expect(isApplyFlowPersistenceV2Enabled({ APPLYFLOW_PERSISTENCE_V2: "1" })).toBe(false);
  });
});
