/**
 * Client-safe persistence bootstrap.
 *
 * Originates from trusted server resolution (RSC or GET /me).
 * The browser may DISPLAY this state; it must NOT authoritatively CREATE it.
 * HTTP APIs continue to authorize every request independently.
 *
 * Temporary (until R2.2.5): after a successful V1→V2 migration POST, the
 * server may still return mode=v2_offering (canonical remains v1_local).
 * The client must not promote itself to v2_active from the local marker alone.
 */

export type ApplyFlowClientPersistenceMode =
  | "v1"
  | "v2_offering"
  | "v2_active"
  | "v2_read_only"
  | "v2_paused";

export type ApplyFlowClientCanonicalPersistence = "v1_local" | "v2_cloud";

export type ApplyFlowClientPersistenceBootstrap =
  | {
      mode: "v1";
      reason: "global_disabled" | "not_eligible" | "rollout_closed" | "rollout_excluded" | "anonymous";
      canonicalPersistence: "v1_local";
      pilotEligible: boolean;
      accountId: string | null;
    }
  | {
      mode: "v2_offering";
      reason: "pilot_eligible";
      canonicalPersistence: "v1_local";
      pilotEligible: true;
      accountId: string;
    }
  | {
      mode: "v2_active";
      reason: "canonical_v2";
      canonicalPersistence: "v2_cloud";
      pilotEligible: true;
      accountId: string;
    }
  | {
      mode: "v2_read_only";
      reason: "pilot_revoked";
      canonicalPersistence: "v2_cloud";
      pilotEligible: false;
      accountId: string;
    }
  | {
      mode: "v2_paused";
      reason: "global_disabled_canonical_v2" | "rollout_closed" | "rollout_excluded";
      canonicalPersistence: "v2_cloud";
      pilotEligible: boolean;
      accountId: string;
    };

export type ApplyFlowClientPersistenceBootstrapResult =
  | { ok: true; bootstrap: ApplyFlowClientPersistenceBootstrap }
  | { ok: false; code: "bootstrap_unavailable" };

export function assertNeverPersistenceMode(value: never): never {
  throw new Error(`Unhandled persistence mode: ${String(value)}`);
}

/** Cloud is canonical only when the server says so — never from a local marker. */
export function clientBootstrapUsesCloudCanonical(
  bootstrap: ApplyFlowClientPersistenceBootstrap,
): boolean {
  return bootstrap.canonicalPersistence === "v2_cloud";
}

/** Mutation UX may be enabled; server remains final enforcement. */
export function clientBootstrapAllowsMutationUx(
  bootstrap: ApplyFlowClientPersistenceBootstrap,
): boolean {
  switch (bootstrap.mode) {
    case "v1":
    case "v2_offering":
    case "v2_active":
      return true;
    case "v2_read_only":
    case "v2_paused":
      return false;
  }
}

export function clientBootstrapMigrationEligible(
  bootstrap: ApplyFlowClientPersistenceBootstrap,
): boolean {
  return bootstrap.mode === "v2_offering";
}

/** Test / RSC helper — builds a typed bootstrap without secrets. */
export function createClientPersistenceBootstrap(
  input: ApplyFlowClientPersistenceBootstrap,
): ApplyFlowClientPersistenceBootstrap {
  return input;
}
