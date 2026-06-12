/**
 * Provider connection status models future provider state only.
 * They do not implement OAuth, Nango runtime, token storage, provider calls, or persistence.
 */

import type {
  ProviderConnectionStatus,
  ProviderKind,
  ProviderRuntime,
} from "../provider-adapter/types.js";

export type ProviderSyncAvailability = "sync_available" | "sync_disabled";

export type ProviderConnectionState = ProviderConnectionStatus | ProviderSyncAvailability;

export type ProviderConnectionCapability = {
  canSync: boolean;
  canRevoke: boolean;
  canDeleteDerivedData: boolean;
  userReviewRequired: true;
};

export type ProviderConnectionSnapshot = {
  provider: ProviderKind;
  runtime: ProviderRuntime;
  status: ProviderConnectionState;
  /** Redacted/minimal account hint — never a raw provider email address. */
  accountHint?: string;
  scopes: string[];
  connectedAt?: string;
  lastSyncAt?: string;
  revokedAt?: string;
  errorCode?: string;
  errorMessage?: string;
  capability: ProviderConnectionCapability;
};

export type ProviderConnectionStatusSummary = {
  total: number;
  connected: number;
  notConnected: number;
  expired: number;
  revoked: number;
  error: number;
  syncAvailable: number;
  syncDisabled: number;
};
