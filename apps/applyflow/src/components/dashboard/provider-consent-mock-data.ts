import {
  canDeleteProviderDerivedData,
  canProviderSync,
  canRevokeProviderConnection,
  collectProviderConnectionWarnings,
  createProviderConnectionSnapshot,
  type ProviderConnectionSnapshot,
  type ProviderConnectionState,
  type ProviderKind,
} from "@devflow/career-sync";

/**
 * Fake/sandbox provider connection snapshots for the read-only consent mock panel.
 * No OAuth, Nango runtime, token storage, provider calls, or persistence.
 */

export const providerConsentMockConnections: ProviderConnectionSnapshot[] = [
  createProviderConnectionSnapshot({
    provider: "gmail",
    runtime: "sandbox",
    status: "not_connected",
    scopes: ["gmail.metadata.read"],
  }),
  createProviderConnectionSnapshot({
    provider: "calendar",
    runtime: "sandbox",
    status: "not_connected",
    scopes: ["calendar.events.read"],
  }),
];

export const PROVIDER_CONSENT_MOCK_PROVIDER_LABELS: Record<ProviderKind, string> = {
  gmail: "Gmail",
  calendar: "Calendar",
};

export const PROVIDER_CONSENT_MOCK_SIGNAL_HINTS: Record<
  ProviderKind,
  { allowedSignals: string; neverStored: string }
> = {
  gmail: {
    allowedSignals: "recruiter screening, follow-up, offer/rejection, company hints",
    neverStored: "raw body, thread ID, message ID, attachments, tokens",
  },
  calendar: {
    allowedSignals: "interview event, technical stage, company hints, event time",
    neverStored: "descriptions, meeting links, attendee emails, event IDs, tokens",
  },
};

export function formatProviderConnectionStatusLabel(status: ProviderConnectionState): string {
  switch (status) {
    case "not_connected":
      return "Not connected";
    case "connected":
      return "Connected";
    case "revoked":
      return "Revoked";
    case "expired":
      return "Expired";
    case "error":
      return "Error";
    case "sync_available":
      return "Sync available";
    case "sync_disabled":
      return "Sync disabled";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function formatProviderCapabilityYesNo(value: boolean): string {
  return value ? "Yes" : "No";
}

export function getProviderConsentMockWarnings(
  snapshot: ProviderConnectionSnapshot,
): string[] {
  return collectProviderConnectionWarnings(snapshot);
}

export function getProviderConsentMockCapabilities(snapshot: ProviderConnectionSnapshot) {
  return {
    canSync: canProviderSync(snapshot),
    canRevoke: canRevokeProviderConnection(snapshot),
    canDeleteDerivedData: canDeleteProviderDerivedData(snapshot),
    userReviewRequired: snapshot.capability.userReviewRequired,
  };
}
