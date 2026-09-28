import type { ApplyFlowCanonicalPersistence } from "@prisma/client";

import { isApplyFlowPersistenceV2Enabled } from "./feature-flag";
import type { ApplyFlowAccountRecord } from "./require-applyflow-account";

/**
 * Trusted inputs for the pure persistence-mode matrix.
 * Never accept client-supplied eligibility or canonical state.
 */
export type ApplyFlowPersistenceModeInput = {
  globalEnabled: boolean;
  pilotEligible: boolean;
  canonicalPersistence: ApplyFlowCanonicalPersistence;
};

export type ApplyFlowPersistenceAccess =
  | {
      mode: "v1";
      reason: "global_disabled" | "not_eligible";
      canonicalPersistence: "v1_local";
    }
  | {
      mode: "v2_offering";
      reason: "pilot_eligible";
      canonicalPersistence: "v1_local";
    }
  | {
      mode: "v2_active";
      reason: "canonical_v2";
      canonicalPersistence: "v2_cloud";
    }
  | {
      mode: "v2_read_only";
      reason: "pilot_revoked";
      canonicalPersistence: "v2_cloud";
    }
  | {
      mode: "v2_paused";
      reason: "global_disabled_canonical_v2";
      canonicalPersistence: "v2_cloud";
    };

/**
 * Pure domain resolver — unit-testable without mutating process.env.
 *
 * Precedence:
 * - canonical=v2_cloud never resolves to v1
 * - GLOBAL=false + v1_local → v1
 * - GLOBAL=false + v2_cloud → v2_paused
 * - GLOBAL=true + v1_local → offering iff pilot, else v1
 * - GLOBAL=true + v2_cloud → active iff pilot, else read_only
 */
export function resolveApplyFlowPersistenceMode(
  input: ApplyFlowPersistenceModeInput,
): ApplyFlowPersistenceAccess {
  const { globalEnabled, pilotEligible, canonicalPersistence } = input;

  if (canonicalPersistence === "v2_cloud") {
    if (!globalEnabled) {
      return {
        mode: "v2_paused",
        reason: "global_disabled_canonical_v2",
        canonicalPersistence: "v2_cloud",
      };
    }
    if (pilotEligible) {
      return {
        mode: "v2_active",
        reason: "canonical_v2",
        canonicalPersistence: "v2_cloud",
      };
    }
    return {
      mode: "v2_read_only",
      reason: "pilot_revoked",
      canonicalPersistence: "v2_cloud",
    };
  }

  // canonicalPersistence === "v1_local"
  if (!globalEnabled) {
    return {
      mode: "v1",
      reason: "global_disabled",
      canonicalPersistence: "v1_local",
    };
  }
  if (!pilotEligible) {
    return {
      mode: "v1",
      reason: "not_eligible",
      canonicalPersistence: "v1_local",
    };
  }
  return {
    mode: "v2_offering",
    reason: "pilot_eligible",
    canonicalPersistence: "v1_local",
  };
}

/**
 * Server wrapper: reads the trusted GLOBAL flag and resolves access for an
 * already-authenticated ApplyFlowAccount loaded from the database.
 */
export function resolveApplyFlowPersistenceAccess(
  account: Pick<ApplyFlowAccountRecord, "pilotEligible" | "canonicalPersistence">,
): ApplyFlowPersistenceAccess {
  return resolveApplyFlowPersistenceMode({
    globalEnabled: isApplyFlowPersistenceV2Enabled(),
    pilotEligible: account.pilotEligible,
    canonicalPersistence: account.canonicalPersistence,
  });
}
