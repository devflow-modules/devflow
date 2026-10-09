import { describe, expect, it } from "vitest";

import {
  classifyApplyFlowAccountRollout,
  parseApplyFlowRolloutSelection,
} from "./rollout-selection";

const PILOT = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";

describe("parseApplyFlowRolloutSelection", () => {
  it("fails closed when the variable is absent, empty, or invalid", () => {
    expect(parseApplyFlowRolloutSelection({}).ok).toBe(false);
    expect(parseApplyFlowRolloutSelection({ APPLYFLOW_PERSISTENCE_V2_ROLLOUT_ACCOUNTS: "" }).ok).toBe(false);
    expect(parseApplyFlowRolloutSelection({ APPLYFLOW_PERSISTENCE_V2_ROLLOUT_ACCOUNTS: " , " }).ok).toBe(false);
    expect(parseApplyFlowRolloutSelection({ APPLYFLOW_PERSISTENCE_V2_ROLLOUT_ACCOUNTS: "not-a-uuid" }).ok).toBe(false);
    expect(
      parseApplyFlowRolloutSelection({
        APPLYFLOW_PERSISTENCE_V2_ROLLOUT_ACCOUNTS: `${PILOT},attacker`,
      }).ok,
    ).toBe(false);
  });

  it("accepts a comma-separated UUID list without echoing it", () => {
    const parsed = parseApplyFlowRolloutSelection({
      APPLYFLOW_PERSISTENCE_V2_ROLLOUT_ACCOUNTS: ` ${PILOT.toUpperCase()} , ${OTHER} `,
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.accountIds.has(PILOT)).toBe(true);
    expect(parsed.accountIds.has(OTHER)).toBe(true);
    expect(JSON.stringify(parsed)).not.toContain("attacker");
  });
});

describe("classifyApplyFlowAccountRollout", () => {
  it("selects only listed accounts and excludes everyone else when the list is valid", () => {
    const env = { APPLYFLOW_PERSISTENCE_V2_ROLLOUT_ACCOUNTS: PILOT };
    expect(classifyApplyFlowAccountRollout(PILOT, env)).toBe("selected");
    expect(classifyApplyFlowAccountRollout(OTHER, env)).toBe("excluded");
  });

  it("closes the rollout for every account when the list is invalid", () => {
    const env = { APPLYFLOW_PERSISTENCE_V2_ROLLOUT_ACCOUNTS: `${PILOT},not-a-uuid` };
    expect(classifyApplyFlowAccountRollout(PILOT, env)).toBe("closed");
    expect(classifyApplyFlowAccountRollout(OTHER, env)).toBe("closed");
  });
});
