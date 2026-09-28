import {
  EMPTY_ACTIVATION_PROTOCOL_VERSION,
  EMPTY_LEGACY_FINGERPRINT,
  LEGACY_EMPTY_ATTESTATION,
  type EmptyActivationProof,
} from "../activation/empty-activation-dto";
import { prepareMigrationBundle } from "../migration/migration-prepare";

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export type EmptyActivationClientResult =
  | { ok: true; proof: EmptyActivationProof }
  | {
      ok: false;
      code:
        | "legacy_not_empty"
        | "legacy_unreadable"
        | "fingerprint_changed"
        | "network"
        | "server"
        | "auth_required"
        | "activation_denied"
        | "activation_conflict";
      message?: string;
    };

/**
 * Client empty-activation protocol:
 * 1. prepare/normalize legacy bundle
 * 2. require empty locally
 * 3. re-read immediately before POST (mutation race)
 * 4. POST /api/applyflow/v2/activate
 * Does not promote client mode — caller must refresh authoritative bootstrap.
 */
export async function requestEmptyLegacyActivation(
  fetchImpl: FetchLike = fetch,
): Promise<EmptyActivationClientResult> {
  const first = prepareMigrationBundle();
  if (!first.ok) {
    return {
      ok: false,
      code: first.code === "legacy_unreadable" ? "legacy_unreadable" : "legacy_not_empty",
    };
  }
  if (!first.empty) {
    return { ok: false, code: "legacy_not_empty" };
  }

  // Re-read immediately before request — local mutation race safeguard.
  const second = prepareMigrationBundle();
  if (!second.ok || !second.empty) {
    return { ok: false, code: "fingerprint_changed" };
  }
  if (second.bundle.fingerprint !== first.bundle.fingerprint) {
    return { ok: false, code: "fingerprint_changed" };
  }
  if (second.bundle.fingerprint !== EMPTY_LEGACY_FINGERPRINT) {
    return { ok: false, code: "legacy_not_empty" };
  }

  try {
    const response = await fetchImpl("/api/applyflow/v2/activate", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        protocolVersion: EMPTY_ACTIVATION_PROTOCOL_VERSION,
        attestation: LEGACY_EMPTY_ATTESTATION,
        sourceVersion: second.bundle.sourceVersion,
        fingerprint: second.bundle.fingerprint,
        jobs: [],
        applications: [],
      }),
    });

    if (response.status === 401 || response.status === 503) {
      return { ok: false, code: "auth_required" };
    }
    if (response.status === 403) {
      return { ok: false, code: "activation_denied" };
    }
    if (response.status === 409) {
      return { ok: false, code: "activation_conflict" };
    }
    if (!response.ok) {
      return { ok: false, code: "server" };
    }

    // Final local re-check before abandoning V1 canonical view.
    const third = prepareMigrationBundle();
    if (!third.ok || !third.empty || third.bundle.fingerprint !== second.bundle.fingerprint) {
      return { ok: false, code: "fingerprint_changed" };
    }

    const proof = (await response.json()) as EmptyActivationProof;
    if (
      (proof.status !== "activated" && proof.status !== "already_active") ||
      proof.canonicalPersistence !== "v2_cloud"
    ) {
      return { ok: false, code: "server" };
    }
    return { ok: true, proof };
  } catch {
    return { ok: false, code: "network" };
  }
}
