/**
 * Gmail read-only adapter contracts — pure types only.
 * Does not call Gmail API, Nango proxy, Google Gmail client libraries, or retain raw provider payloads.
 */

export type GmailReadOnlyRuntime = "nango" | "sandbox";

export type GmailReadOnlyAdapterBlockReason =
  | "connection_not_verified"
  | "invalid_time_window"
  | "unsafe_message_limit"
  | "runtime_not_supported";

export type GmailReadOnlyAdapterRequest = {
  provider: "gmail";
  runtime: GmailReadOnlyRuntime;
  connectionVerified: boolean;
  requestedAt: string;
  window?: {
    from?: string;
    to?: string;
    maxMessages: number;
  };
  userReviewRequired: true;
};

/**
 * Ephemeral metadata for future read-only classification.
 * Must not include raw subject, snippet, body, message/thread IDs, or full email addresses.
 */
export type GmailEphemeralMessageMetadata = {
  occurredAt: string;
  direction: "inbound" | "outbound" | "unknown";
  senderDomain?: string;
  recipientDomains: string[];
  hasAttachment: boolean;
  threadMessageCount?: number;
  labels?: string[];
};

export type GmailDerivedSignalKind =
  | "application_detected"
  | "interview_likely"
  | "follow_up_required"
  | "recruiter_response_detected"
  | "rejection_likely"
  | "offer_likely";

export type GmailDerivedSignal = {
  id: string;
  kind: GmailDerivedSignalKind;
  provider: "gmail";
  occurredAt: string;
  company?: string;
  confidence: number;
  reviewRequired: true;
  sourceCount: number;
};

export type GmailReadOnlyAdapterStatus = "blocked" | "ready" | "completed" | "error";

export type GmailReadOnlyAdapterResult = {
  provider: "gmail";
  runtime: GmailReadOnlyRuntime;
  status: GmailReadOnlyAdapterStatus;
  safeForClient: true;
  readOnly: true;
  connectionVerified: boolean;
  importedRawMessages: false;
  retainedRawPayload: false;
  retainedBodies: false;
  retainedSnippets: false;
  retainedAttachments: false;
  hasToken: false;
  userReviewRequired: true;
  signals: GmailDerivedSignal[];
  warnings: string[];
  messages: string[];
  processedMessageCount: number;
};

export type GmailReadOnlySafetyPolicy = {
  readOnly: true;
  allowRawBodies: false;
  allowRawSnippets: false;
  allowAttachments: false;
  allowRawProviderPayload: false;
  allowTokenExposure: false;
  allowMeetingLinks: false;
  requireVerifiedConnection: true;
  requireUserReview: true;
};

export type GmailReadOnlyAdapter = {
  execute(request: GmailReadOnlyAdapterRequest): Promise<GmailReadOnlyAdapterResult>;
};

/**
 * Future metadata source boundary — must not return raw Gmail API payloads.
 */
export type GmailReadOnlyMetadataProvider = {
  listMessageMetadata(input: {
    from?: string;
    to?: string;
    limit: number;
  }): Promise<GmailEphemeralMessageMetadata[]>;
};

export type GmailReadOnlyAdapterRequestEvaluation = {
  status: "blocked" | "ready";
  request: GmailReadOnlyAdapterRequest;
  reasons: GmailReadOnlyAdapterBlockReason[];
};
