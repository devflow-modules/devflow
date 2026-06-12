import type {
  ProviderConnectionCapability,
  ProviderConnectionSnapshot,
  ProviderConnectionState,
  ProviderConnectionStatusSummary,
} from "./types.js";

const SYNC_ALLOWED_STATUSES: ReadonlySet<ProviderConnectionState> = new Set([
  "connected",
  "sync_available",
]);

const REVOCABLE_STATUSES: ReadonlySet<ProviderConnectionState> = new Set([
  "connected",
  "sync_available",
  "expired",
  "error",
]);

export function createProviderConnectionCapability(
  overrides?: Partial<Omit<ProviderConnectionCapability, "userReviewRequired">>,
): ProviderConnectionCapability {
  return {
    canSync: overrides?.canSync ?? false,
    canRevoke: overrides?.canRevoke ?? false,
    canDeleteDerivedData: overrides?.canDeleteDerivedData ?? false,
    userReviewRequired: true,
  };
}

export function createProviderConnectionSnapshot(
  input: Omit<ProviderConnectionSnapshot, "capability"> & {
    capability?: Partial<Omit<ProviderConnectionCapability, "userReviewRequired">>;
  },
): ProviderConnectionSnapshot {
  const { capability: capabilityOverrides, scopes, ...rest } = input;

  return {
    ...rest,
    scopes: [...scopes].sort((a, b) => a.localeCompare(b)),
    capability: createProviderConnectionCapability(capabilityOverrides),
  };
}

export function isProviderConnected(snapshot: ProviderConnectionSnapshot): boolean {
  return snapshot.status === "connected" || snapshot.status === "sync_available";
}

export function canProviderSync(snapshot: ProviderConnectionSnapshot): boolean {
  return SYNC_ALLOWED_STATUSES.has(snapshot.status) && snapshot.capability.canSync === true;
}

export function canRevokeProviderConnection(snapshot: ProviderConnectionSnapshot): boolean {
  return REVOCABLE_STATUSES.has(snapshot.status) && snapshot.capability.canRevoke === true;
}

export function canDeleteProviderDerivedData(snapshot: ProviderConnectionSnapshot): boolean {
  return snapshot.capability.canDeleteDerivedData === true;
}

export function summarizeProviderConnections(
  snapshots: ProviderConnectionSnapshot[],
): ProviderConnectionStatusSummary {
  const summary: ProviderConnectionStatusSummary = {
    total: snapshots.length,
    connected: 0,
    notConnected: 0,
    expired: 0,
    revoked: 0,
    error: 0,
    syncAvailable: 0,
    syncDisabled: 0,
  };

  for (const snapshot of snapshots) {
    switch (snapshot.status) {
      case "connected":
        summary.connected += 1;
        break;
      case "not_connected":
        summary.notConnected += 1;
        break;
      case "expired":
        summary.expired += 1;
        break;
      case "revoked":
        summary.revoked += 1;
        break;
      case "error":
        summary.error += 1;
        break;
      case "sync_available":
        summary.syncAvailable += 1;
        break;
      case "sync_disabled":
        summary.syncDisabled += 1;
        break;
      default: {
        const _exhaustive: never = snapshot.status;
        void _exhaustive;
      }
    }
  }

  return summary;
}

export function collectProviderConnectionWarnings(snapshot: ProviderConnectionSnapshot): string[] {
  const warnings: string[] = [];

  if (snapshot.status === "connected" && snapshot.connectedAt == null) {
    warnings.push("connected status requires connectedAt");
  }

  if (snapshot.status === "revoked" && snapshot.revokedAt == null) {
    warnings.push("revoked status requires revokedAt");
  }

  if (
    snapshot.status === "error" &&
    snapshot.errorCode == null &&
    (snapshot.errorMessage == null || snapshot.errorMessage.trim() === "")
  ) {
    warnings.push("error status requires errorCode or errorMessage");
  }

  if (snapshot.capability.canSync && !SYNC_ALLOWED_STATUSES.has(snapshot.status)) {
    warnings.push("canSync is true but status does not allow sync");
  }

  if (snapshot.status === "connected" && snapshot.scopes.length === 0) {
    warnings.push("connected status should declare scopes");
  }

  return warnings;
}
