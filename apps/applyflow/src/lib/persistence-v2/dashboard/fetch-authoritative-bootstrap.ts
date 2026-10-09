import type { ApplyFlowClientPersistenceBootstrap } from "./client-persistence-bootstrap";

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

/**
 * Re-fetch server-authoritative persistence bootstrap from GET /me.
 * Used after migration or empty activation — never invent mode client-side.
 */
export async function fetchAuthoritativePersistenceBootstrap(
  fetchImpl: FetchLike = fetch,
): Promise<
  | { ok: true; bootstrap: ApplyFlowClientPersistenceBootstrap }
  | {
      ok: false;
      code: "unauthenticated" | "auth_not_configured" | "network" | "server" | "bootstrap_unavailable";
    }
> {
  try {
    const response = await fetchImpl("/api/applyflow/v2/me", {
      method: "GET",
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    });
    if (response.status === 401) return { ok: false, code: "unauthenticated" };
    if (response.status === 503) return { ok: false, code: "auth_not_configured" };
    if (!response.ok) return { ok: false, code: "server" };

    const body = (await response.json().catch(() => null)) as {
      account?: { id?: string };
      persistence?: {
        mode?: string;
        reason?: string;
        pilotEligible?: boolean;
        canonicalPersistence?: string;
      };
    } | null;

    const accountId = body?.account?.id;
    const persistence = body?.persistence;
    if (
      typeof accountId !== "string" ||
      !accountId.trim() ||
      !persistence ||
      typeof persistence.mode !== "string" ||
      typeof persistence.reason !== "string" ||
      typeof persistence.pilotEligible !== "boolean" ||
      (persistence.canonicalPersistence !== "v1_local" &&
        persistence.canonicalPersistence !== "v2_cloud")
    ) {
      return { ok: false, code: "bootstrap_unavailable" };
    }

    const id = accountId.trim();
    switch (persistence.mode) {
      case "v1":
        return {
          ok: true,
          bootstrap: {
            mode: "v1",
            reason:
              persistence.reason === "not_eligible" ||
              persistence.reason === "rollout_closed" ||
              persistence.reason === "rollout_excluded"
                ? persistence.reason
                : "global_disabled",
            canonicalPersistence: "v1_local",
            pilotEligible: persistence.pilotEligible,
            accountId: id,
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
            accountId: id,
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
            accountId: id,
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
            accountId: id,
          },
        };
      case "v2_paused":
        return {
          ok: true,
          bootstrap: {
            mode: "v2_paused",
            reason:
              persistence.reason === "rollout_closed" || persistence.reason === "rollout_excluded"
                ? persistence.reason
                : "global_disabled_canonical_v2",
            canonicalPersistence: "v2_cloud",
            pilotEligible: persistence.pilotEligible,
            accountId: id,
          },
        };
      default:
        return { ok: false, code: "bootstrap_unavailable" };
    }
  } catch {
    return { ok: false, code: "network" };
  }
}
