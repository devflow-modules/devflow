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
    input: { globalEnabled: true, pilotEligible: false, canonicalPersistence: "v1_local" },
    expected: { mode: "v1", reason: "not_eligible", canonicalPersistence: "v1_local" },
  },
  {
    name: "GLOBAL true | pilot true | v1_local → v2_offering",
    input: { globalEnabled: true, pilotEligible: true, canonicalPersistence: "v1_local" },
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
    input: { globalEnabled: true, pilotEligible: false, canonicalPersistence: "v2_cloud" },
    expected: { mode: "v2_read_only", reason: "pilot_revoked", canonicalPersistence: "v2_cloud" },
  },
  {
    name: "GLOBAL true | pilot true | v2_cloud → v2_active",
    input: { globalEnabled: true, pilotEligible: true, canonicalPersistence: "v2_cloud" },
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
      { globalEnabled: true, pilotEligible: false, canonicalPersistence: "v2_cloud" },
      { globalEnabled: true, pilotEligible: true, canonicalPersistence: "v2_cloud" },
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

  it("GLOBAL true + v2_cloud + pilot false → read_only", () => {
    expect(
      resolveApplyFlowPersistenceMode({
        globalEnabled: true,
        pilotEligible: false,
        canonicalPersistence: "v2_cloud",
      }).mode,
    ).toBe("v2_read_only");
  });
});

describe("resolveApplyFlowPersistenceAccess", () => {
  const previous = process.env.APPLYFLOW_PERSISTENCE_V2;

  afterEach(() => {
    if (previous === undefined) delete process.env.APPLYFLOW_PERSISTENCE_V2;
    else process.env.APPLYFLOW_PERSISTENCE_V2 = previous;
  });

  it("reads GLOBAL flag via feature-flag helper", () => {
    process.env.APPLYFLOW_PERSISTENCE_V2 = "true";
    expect(
      resolveApplyFlowPersistenceAccess({
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
