import { afterEach, describe, expect, it } from "vitest";

import {
  assertApplyFlowV2HttpCapability,
  ApplyFlowV2HttpAccessError,
  type ApplyFlowV2HttpCapability,
} from "./http-access";
import {
  resolveApplyFlowPersistenceMode,
  type ApplyFlowPersistenceAccess,
  type ApplyFlowPersistenceModeInput,
} from "./resolve-persistence-access";

function access(input: ApplyFlowPersistenceModeInput): ApplyFlowPersistenceAccess {
  return resolveApplyFlowPersistenceMode(input);
}

function expectDeny(
  input: ApplyFlowPersistenceModeInput,
  capability: ApplyFlowV2HttpCapability,
  code: string,
  status: number,
) {
  expect(() => assertApplyFlowV2HttpCapability(access(input), capability)).toThrow(
    expect.objectContaining({
      name: "ApplyFlowV2HttpAccessError",
      code,
      status,
    }),
  );
}

function expectAllow(input: ApplyFlowPersistenceModeInput, capability: ApplyFlowV2HttpCapability) {
  expect(() => assertApplyFlowV2HttpCapability(access(input), capability)).not.toThrow();
}

describe("assertApplyFlowV2HttpCapability", () => {
  it("denies all capabilities for v1 global_disabled", () => {
    const input: ApplyFlowPersistenceModeInput = {
      globalEnabled: false,
      pilotEligible: false,
      canonicalPersistence: "v1_local",
    };
    for (const capability of ["read", "write", "migration", "migration_session_read"] as const) {
      expectDeny(input, capability, "persistence_v2_disabled", 404);
    }
  });

  it("denies all capabilities for v1 not_eligible", () => {
    const input: ApplyFlowPersistenceModeInput = {
      globalEnabled: true,
      pilotEligible: false,
      canonicalPersistence: "v1_local",
    };
    expectDeny(input, "write", "persistence_v2_not_eligible", 403);
    expectDeny(input, "migration", "persistence_v2_not_eligible", 403);
    expectDeny(input, "read", "persistence_v2_not_eligible", 403);
  });

  it("offering: denies product read/write; allows migration/session/activation (AF-REL-003)", () => {
    const input: ApplyFlowPersistenceModeInput = {
      globalEnabled: true,
      pilotEligible: true,
      canonicalPersistence: "v1_local",
    };
    expectDeny(input, "read", "persistence_v2_migration_required", 403);
    expectDeny(input, "write", "persistence_v2_migration_required", 403);
    expectAllow(input, "migration");
    expectAllow(input, "migration_session_read");
    expectAllow(input, "activation");
  });

  it("active: allows read/write/session; denies new migration", () => {
    const input: ApplyFlowPersistenceModeInput = {
      globalEnabled: true,
      pilotEligible: true,
      canonicalPersistence: "v2_cloud",
    };
    expectAllow(input, "read");
    expectAllow(input, "write");
    expectAllow(input, "migration_session_read");
    expectDeny(input, "migration", "persistence_v2_migration_not_applicable", 403);
  });

  it("read_only: allows read/session; denies write/migration", () => {
    const input: ApplyFlowPersistenceModeInput = {
      globalEnabled: true,
      pilotEligible: false,
      canonicalPersistence: "v2_cloud",
    };
    expectAllow(input, "read");
    expectAllow(input, "migration_session_read");
    expectDeny(input, "write", "persistence_v2_read_only", 403);
    expectDeny(input, "migration", "persistence_v2_migration_not_applicable", 403);
  });

  it("paused: denies all capabilities without falling back to v1", () => {
    const input: ApplyFlowPersistenceModeInput = {
      globalEnabled: false,
      pilotEligible: true,
      canonicalPersistence: "v2_cloud",
    };
    const resolved = access(input);
    expect(resolved.mode).toBe("v2_paused");
    expect(resolved.mode).not.toBe("v1");
    for (const capability of ["read", "write", "migration", "migration_session_read"] as const) {
      expectDeny(input, capability, "persistence_v2_paused", 503);
    }
  });

  it("throws ApplyFlowV2HttpAccessError instances", () => {
    try {
      assertApplyFlowV2HttpCapability(
        access({
          globalEnabled: true,
          pilotEligible: false,
          canonicalPersistence: "v2_cloud",
        }),
        "write",
      );
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(ApplyFlowV2HttpAccessError);
      expect((error as ApplyFlowV2HttpAccessError).code).toBe("persistence_v2_read_only");
    }
  });
});

describe("HTTP policy security matrix (direct bypass)", () => {
  afterEach(() => {
    // pure functions — no env mutation required
  });

  it("pilot=false v1_local cannot write jobs/apps/migration", () => {
    const input: ApplyFlowPersistenceModeInput = {
      globalEnabled: true,
      pilotEligible: false,
      canonicalPersistence: "v1_local",
    };
    expectDeny(input, "write", "persistence_v2_not_eligible", 403);
    expectDeny(input, "migration", "persistence_v2_not_eligible", 403);
  });

  it("pilot=true v1_local can migrate/activate but not product read/write CRUD (AF-REL-003)", () => {
    const input: ApplyFlowPersistenceModeInput = {
      globalEnabled: true,
      pilotEligible: true,
      canonicalPersistence: "v1_local",
    };
    expectAllow(input, "migration");
    expectAllow(input, "activation");
    expectDeny(input, "read", "persistence_v2_migration_required", 403);
    expectDeny(input, "write", "persistence_v2_migration_required", 403);
  });

  it("read_only can read but not mutate", () => {
    const input: ApplyFlowPersistenceModeInput = {
      globalEnabled: true,
      pilotEligible: false,
      canonicalPersistence: "v2_cloud",
    };
    expectAllow(input, "read");
    expectDeny(input, "write", "persistence_v2_read_only", 403);
  });

  it("paused cannot read or write", () => {
    const input: ApplyFlowPersistenceModeInput = {
      globalEnabled: false,
      pilotEligible: false,
      canonicalPersistence: "v2_cloud",
    };
    expectDeny(input, "read", "persistence_v2_paused", 503);
    expectDeny(input, "write", "persistence_v2_paused", 503);
  });
});
