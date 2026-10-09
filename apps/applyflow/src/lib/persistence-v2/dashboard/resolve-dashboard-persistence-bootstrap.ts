import {
  ApplyFlowAuthError,
  requireApplyFlowAccount,
} from "../require-applyflow-account";
import { resolveApplyFlowPersistenceAccess } from "../resolve-persistence-access";

import type {
  ApplyFlowClientPersistenceBootstrap,
  ApplyFlowClientPersistenceBootstrapResult,
} from "./client-persistence-bootstrap";

function anonymousV1Bootstrap(): ApplyFlowClientPersistenceBootstrap {
  return {
    mode: "v1",
    reason: "anonymous",
    canonicalPersistence: "v1_local",
    pilotEligible: false,
    accountId: null,
  };
}

/**
 * Server-authoritative dashboard bootstrap for RSC entrypoints.
 *
 * Reuses resolveApplyFlowPersistenceAccess — does not reconstruct mode from
 * pilotEligible / canonicalPersistence / GLOBAL inside the client.
 *
 * Unauthenticated visitors keep Production V1 local semantics (no account create).
 * Unexpected failures fail closed (no silent V1 when cloud may be canonical).
 */
export async function resolveDashboardPersistenceBootstrap(): Promise<ApplyFlowClientPersistenceBootstrapResult> {
  try {
    const account = await requireApplyFlowAccount();
    const access = resolveApplyFlowPersistenceAccess(account);

    switch (access.mode) {
      case "v1":
        return {
          ok: true,
          bootstrap: {
            mode: "v1",
            reason: access.reason,
            canonicalPersistence: "v1_local",
            pilotEligible: account.pilotEligible,
            accountId: account.id,
          },
        };
      case "v2_offering":
        return {
          ok: true,
          bootstrap: {
            mode: "v2_offering",
            reason: "pilot_eligible",
            canonicalPersistence: "v1_local",
            pilotEligible: true,
            accountId: account.id,
          },
        };
      case "v2_active":
        return {
          ok: true,
          bootstrap: {
            mode: "v2_active",
            reason: "canonical_v2",
            canonicalPersistence: "v2_cloud",
            pilotEligible: true,
            accountId: account.id,
          },
        };
      case "v2_read_only":
        return {
          ok: true,
          bootstrap: {
            mode: "v2_read_only",
            reason: "pilot_revoked",
            canonicalPersistence: "v2_cloud",
            pilotEligible: false,
            accountId: account.id,
          },
        };
      case "v2_paused":
        return {
          ok: true,
          bootstrap: {
            mode: "v2_paused",
            reason: access.reason,
            canonicalPersistence: "v2_cloud",
            pilotEligible: account.pilotEligible,
            accountId: account.id,
          },
        };
      default: {
        const _exhaustive: never = access;
        void _exhaustive;
        return { ok: false, code: "bootstrap_unavailable" };
      }
    }
  } catch (error) {
    if (error instanceof ApplyFlowAuthError) {
      // Preserve anonymous / misconfigured-auth V1 UX — never invent cloud.
      return { ok: true, bootstrap: anonymousV1Bootstrap() };
    }
    return { ok: false, code: "bootstrap_unavailable" };
  }
}
