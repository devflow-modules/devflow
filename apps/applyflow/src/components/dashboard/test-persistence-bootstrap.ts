import type { ApplyFlowClientPersistenceBootstrapResult } from "@/lib/persistence-v2/dashboard/client-persistence-bootstrap";

/** Shared fixture account id for dashboard persistence tests. */
export const TEST_PERSISTENCE_ACCOUNT_ID = "acc_test_dashboard";

export const testBootstrapV1: ApplyFlowClientPersistenceBootstrapResult = {
  ok: true,
  bootstrap: {
    mode: "v1",
    reason: "global_disabled",
    canonicalPersistence: "v1_local",
    pilotEligible: false,
    accountId: TEST_PERSISTENCE_ACCOUNT_ID,
  },
};

/** Pilot offering — migration / V1-local canonical (pre R2.2.5). */
export const testBootstrapOffering: ApplyFlowClientPersistenceBootstrapResult = {
  ok: true,
  bootstrap: {
    mode: "v2_offering",
    reason: "pilot_eligible",
    canonicalPersistence: "v1_local",
    pilotEligible: true,
    accountId: TEST_PERSISTENCE_ACCOUNT_ID,
  },
};

export const testBootstrapActive: ApplyFlowClientPersistenceBootstrapResult = {
  ok: true,
  bootstrap: {
    mode: "v2_active",
    reason: "canonical_v2",
    canonicalPersistence: "v2_cloud",
    pilotEligible: true,
    accountId: TEST_PERSISTENCE_ACCOUNT_ID,
  },
};

export const testBootstrapUnavailable: ApplyFlowClientPersistenceBootstrapResult = {
  ok: false,
  code: "bootstrap_unavailable",
};
