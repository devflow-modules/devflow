import type { ApplyFlowCanonicalPersistence } from "@prisma/client";

import { isApplyFlowPersistenceV2Enabled, type ApplyFlowPersistenceEnv } from "./feature-flag";
import type { ApplyFlowAccountRecord } from "./require-applyflow-account";
import {
  classifyApplyFlowAccountRollout,
  type ApplyFlowRolloutParticipation,
} from "./rollout-selection";

/**
 * Trusted inputs for the pure persistence-mode matrix.
 * Never accept client-supplied eligibility, canonical state, or rollout membership.
 */
export type ApplyFlowPersistenceModeInput = {
  globalEnabled: boolean;
  pilotEligible: boolean;
  canonicalPersistence: ApplyFlowCanonicalPersistence;
  /**
   * Ignored while the global flag is off.
   * When the flag is on, omitted participation fails closed (`closed`).
   */
  rollout?: ApplyFlowRolloutParticipation;
};

export type ApplyFlowPersistenceAccess =
  | {
      mode: "v1";
      reason: "global_disabled" | "not_eligible" | "rollout_closed" | "rollout_excluded";
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
      reason: "global_disabled_canonical_v2" | "rollout_closed" | "rollout_excluded";
      canonicalPersistence: "v2_cloud";
    };

/**
 * Pure domain resolver — unit-testable without mutating process.env.
 *
 * Precedence:
 * - canonical=v2_cloud never resolves to v1
 * - GLOBAL=false preserves the previous matrix and ignores rollout selection
 * - GLOBAL=true + rollout closed/excluded + v1_local → v1
 * - GLOBAL=true + rollout closed/excluded + v2_cloud → v2_paused
 * - GLOBAL=true + selected + v1_local → offering iff pilot, else v1
 * - GLOBAL=true + selected + v2_cloud → active iff pilot, else read_only
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
    const rollout = input.rollout ?? "closed";
    if (rollout !== "selected") {
      return {
        mode: "v2_paused",
        reason: rollout === "closed" ? "rollout_closed" : "rollout_excluded",
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

  if (!globalEnabled) {
    return {
      mode: "v1",
      reason: "global_disabled",
      canonicalPersistence: "v1_local",
    };
  }
  const rollout = input.rollout ?? "closed";
  if (rollout === "closed") {
    return {
      mode: "v1",
      reason: "rollout_closed",
      canonicalPersistence: "v1_local",
    };
  }
  if (rollout === "excluded") {
    return {
      mode: "v1",
      reason: "rollout_excluded",
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
 * Server wrapper: GLOBAL flag plus the server-side rollout allowlist.
 * Account id comes from the database row, never from the request body.
 */
export function resolveApplyFlowPersistenceAccess(
  account: Pick<ApplyFlowAccountRecord, "id" | "pilotEligible" | "canonicalPersistence">,
  env: ApplyFlowPersistenceEnv = process.env,
): ApplyFlowPersistenceAccess {
  const globalEnabled = isApplyFlowPersistenceV2Enabled(env);
  return resolveApplyFlowPersistenceMode({
    globalEnabled,
    pilotEligible: account.pilotEligible,
    canonicalPersistence: account.canonicalPersistence,
    rollout: globalEnabled ? classifyApplyFlowAccountRollout(account.id, env) : undefined,
  });
}
