/**
 * Provider adapter contracts do not implement OAuth, Nango runtime, Gmail API, Calendar API,
 * or provider calls. They only define safe boundaries for future adapters.
 * Raw provider payloads must be discarded before data reaches CareerBundle.
 */

export type ProviderKind = "gmail" | "calendar";

export type ProviderRuntime = "sandbox" | "nango" | "manual";

export type ProviderConnectionStatus =
  | "not_connected"
  | "connected"
  | "revoked"
  | "expired"
  | "error";

export type ProviderConnectionMetadata = {
  provider: ProviderKind;
  runtime: ProviderRuntime;
  status: ProviderConnectionStatus;
  connectedAt?: string;
  lastSyncAt?: string;
  revokedAt?: string;
  /** Redacted account hint only — never a raw email address from the provider. */
  accountHint?: string;
};

export type ProviderSyncConsent = {
  consentedAt: string;
  provider: ProviderKind;
  runtime: ProviderRuntime;
  scopes: string[];
  userReviewRequired: true;
  canRevoke: true;
  canDeleteDerivedData: true;
};

export type ProviderSyncRequest = {
  provider: ProviderKind;
  runtime: ProviderRuntime;
  connection: ProviderConnectionMetadata;
  consent: ProviderSyncConsent;
  requestedAt: string;
};

export type ProviderAdapterSafetyPolicy = {
  rawPayloadRetained: false;
  tokensExposedToClient: false;
  meetingLinksRetained: false;
  attachmentsRetained: false;
  providerIdsRetained: false;
  userReviewRequired: true;
};

export type ProviderAdapterResult<TDerived> = {
  provider: ProviderKind;
  runtime: ProviderRuntime;
  derived: TDerived[];
  generatedAt: string;
  safety: ProviderAdapterSafetyPolicy;
  warnings: string[];
};

/**
 * Normalized Gmail-like input after adapter mapping.
 * `id` is adapter-generated (fake/safe) — not a raw provider message ID.
 * Must not include threadId, messageId, body, headers, attachments, or provider payload.
 */
export type ProviderNormalizedMessage = {
  id: string;
  provider: "gmail";
  receivedAt?: string;
  subject?: string;
  safeSummary?: string;
  companyHint?: string;
  processStageHint?: string;
  actionRequired?: boolean;
  rawRetained: false;
};

/**
 * Normalized Calendar-like input after adapter mapping.
 * `id` is adapter-generated (fake/safe) — not a raw provider event ID.
 * Must not include description, hangoutLink, htmlLink, attendees, conference data, or provider payload.
 */
export type ProviderNormalizedEvent = {
  id: string;
  provider: "calendar";
  eventAt?: string;
  title?: string;
  safeSummary?: string;
  companyHint?: string;
  processStageHint?: string;
  actionRequired?: boolean;
  rawRetained: false;
  meetingLinkRetained: false;
};

export type ProviderAdapter<TOutput> = {
  provider: ProviderKind;
  runtime: ProviderRuntime;
  sync(request: ProviderSyncRequest): Promise<ProviderAdapterResult<TOutput>>;
};
