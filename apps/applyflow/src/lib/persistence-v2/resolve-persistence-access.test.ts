import { afterEach, describe, expect, it } from "vitest";

import {
  resolveApplyFlowPersistenceAccess,
  resolveApplyFlowPersistenceMode,
  type ApplyFlowPersistenceAccess,
  type ApplyFlowPersistenceModeInput,
} from "./resolve-persistence-access";

const MATRIX: Array<{
  name: string;
  input: ApplyFlowPersistenceModeInput;
  expected: ApplyFlowPersistenceAccess;
}> = [
  {
    name: "GLOBAL false | pilot false | v1_local → v1",
    input: { globalEnabled: false, pilotEligible: false, canonicalPersistence: "v1_local" },
    expected: { mode: "v1", reason: "global_disabled", canonicalPersistence: "v1_local" },
  },
  {
    name: "GLOBAL false | pilot true | v1_local → v1",
    input: { globalEnabled: false, pilotEligible: true, canonicalPersistence: "v1_local" },
    expected: { mode: "v1", reason: "global_disabled", canonicalPersistence: "v1_local" },
  },
  {
    name: "GLOBAL true | pilot false | v1_local → v1",
    input: { globalEnabled: true, pilotEligible: false, canonicalPersistence: "v1_local", rollout: "selected" },
    expected: { mode: "v1", reason: "not_eligible", canonicalPersistence: "v1_local" },
  },
  {
    name: "GLOBAL true | pilot true | v1_local → v2_offering",
    input: { globalEnabled: true, pilotEligible: true, canonicalPersistence: "v1_local", rollout: "selected" },
    expected: { mode: "v2_offering", reason: "pilot_eligible", canonicalPersistence: "v1_local" },
  },
  {
    name: "GLOBAL false | pilot false | v2_cloud → v2_paused",
    input: { globalEnabled: false, pilotEligible: false, canonicalPersistence: "v2_cloud" },
    expected: {
      mode: "v2_paused",
      reason: "global_disabled_canonical_v2",
      canonicalPersistence: "v2_cloud",
    },
  },
  {
    name: "GLOBAL false | pilot true | v2_cloud → v2_paused",
    input: { globalEnabled: false, pilotEligible: true, canonicalPersistence: "v2_cloud" },
    expected: {
      mode: "v2_paused",
      reason: "global_disabled_canonical_v2",
      canonicalPersistence: "v2_cloud",
    },
  },
  {
    name: "GLOBAL true | pilot false | v2_cloud → v2_read_only",
    input: { globalEnabled: true, pilotEligible: false, canonicalPersistence: "v2_cloud", rollout: "selected" },
    expected: { mode: "v2_read_only", reason: "pilot_revoked", canonicalPersistence: "v2_cloud" },
  },
  {
    name: "GLOBAL true | pilot true | v2_cloud → v2_active",
    input: { globalEnabled: true, pilotEligible: true, canonicalPersistence: "v2_cloud", rollout: "selected" },
    expected: { mode: "v2_active", reason: "canonical_v2", canonicalPersistence: "v2_cloud" },
  },
];

describe("resolveApplyFlowPersistenceMode", () => {
  it.each(MATRIX)("$name", ({ input, expected }) => {
    expect(resolveApplyFlowPersistenceMode(input)).toEqual(expected);
  });

  it("never resolves canonical=v2_cloud to v1 (invariant)", () => {
    const cases: ApplyFlowPersistenceModeInput[] = [
      { globalEnabled: false, pilotEligible: false, canonicalPersistence: "v2_cloud" },
      { globalEnabled: false, pilotEligible: true, canonicalPersistence: "v2_cloud" },
      { globalEnabled: true, pilotEligible: false, canonicalPersistence: "v2_cloud", rollout: "selected" },
      { globalEnabled: true, pilotEligible: true, canonicalPersistence: "v2_cloud", rollout: "selected" },
      { globalEnabled: true, pilotEligible: true, canonicalPersistence: "v2_cloud", rollout: "excluded" },
      { globalEnabled: true, pilotEligible: true, canonicalPersistence: "v2_cloud", rollout: "closed" },
    ];
    for (const input of cases) {
      const access = resolveApplyFlowPersistenceMode(input);
      expect(access.mode).not.toBe("v1");
      expect(access.canonicalPersistence).toBe("v2_cloud");
    }
  });

  it("GLOBAL false + v1_local + pilot true → v1 (kill switch wins)", () => {
    expect(
      resolveApplyFlowPersistenceMode({
        globalEnabled: false,
        pilotEligible: true,
        canonicalPersistence: "v1_local",
      }),
    ).toEqual({
      mode: "v1",
      reason: "global_disabled",
      canonicalPersistence: "v1_local",
    });
  });

  it("GLOBAL false + v2_cloud + pilot true → paused", () => {
    expect(
      resolveApplyFlowPersistenceMode({
        globalEnabled: false,
        pilotEligible: true,
        canonicalPersistence: "v2_cloud",
      }).mode,
    ).toBe("v2_paused");
  });

  it("GLOBAL true + v2_cloud + pilot false + selected → read_only", () => {
    expect(
      resolveApplyFlowPersistenceMode({
        globalEnabled: true,
        pilotEligible: false,
        canonicalPersistence: "v2_cloud",
        rollout: "selected",
      }).mode,
    ).toBe("v2_read_only");
  });

  it("GLOBAL true + not selected + v2_cloud stays paused even when eligible", () => {
    expect(
      resolveApplyFlowPersistenceMode({
        globalEnabled: true,
        pilotEligible: true,
        canonicalPersistence: "v2_cloud",
        rollout: "excluded",
      }),
    ).toEqual({
      mode: "v2_paused",
      reason: "rollout_excluded",
      canonicalPersistence: "v2_cloud",
    });
  });

  it("GLOBAL true + closed rollout does not offer or activate", () => {
    expect(
      resolveApplyFlowPersistenceMode({
        globalEnabled: true,
        pilotEligible: true,
        canonicalPersistence: "v1_local",
      }).reason,
    ).toBe("rollout_closed");
    expect(
      resolveApplyFlowPersistenceMode({
        globalEnabled: true,
        pilotEligible: true,
        canonicalPersistence: "v2_cloud",
        rollout: "closed",
      }).mode,
    ).toBe("v2_paused");
  });
});

describe("resolveApplyFlowPersistenceAccess", () => {
  const previous = process.env.APPLYFLOW_PERSISTENCE_V2;
  const previousRollout = process.env.APPLYFLOW_PERSISTENCE_V2_ROLLOUT_ACCOUNTS;
  const accountId = "11111111-1111-4111-8111-111111111111";

  afterEach(() => {
    if (previous === undefined) delete process.env.APPLYFLOW_PERSISTENCE_V2;
    else process.env.APPLYFLOW_PERSISTENCE_V2 = previous;
    if (previousRollout === undefined) delete process.env.APPLYFLOW_PERSISTENCE_V2_ROLLOUT_ACCOUNTS;
    else process.env.APPLYFLOW_PERSISTENCE_V2_ROLLOUT_ACCOUNTS = previousRollout;
  });

  it("reads GLOBAL flag via feature-flag helper", () => {
    process.env.APPLYFLOW_PERSISTENCE_V2 = "true";
    process.env.APPLYFLOW_PERSISTENCE_V2_ROLLOUT_ACCOUNTS = accountId;
    expect(
      resolveApplyFlowPersistenceAccess({
        id: accountId,
        pilotEligible: true,
        canonicalPersistence: "v1_local",
      }),
    ).toEqual({
      mode: "v2_offering",
      reason: "pilot_eligible",
      canonicalPersistence: "v1_local",
    });

    process.env.APPLYFLOW_PERSISTENCE_V2 = "false";
    expect(
      resolveApplyFlowPersistenceAccess({
        id: accountId,
        pilotEligible: true,
        canonicalPersistence: "v1_local",
      }),
    ).toEqual({
      mode: "v1",
      reason: "global_disabled",
      canonicalPersistence: "v1_local",
    });
  });
});
