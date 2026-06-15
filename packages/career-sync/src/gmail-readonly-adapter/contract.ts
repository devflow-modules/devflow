import type {
  GmailDerivedSignal,
  GmailReadOnlyAdapterBlockReason,
  GmailReadOnlyAdapterRequest,
  GmailReadOnlyAdapterRequestEvaluation,
  GmailReadOnlyAdapterResult,
  GmailReadOnlyAdapterStatus,
  GmailReadOnlyRuntime,
} from "./types.js";

export const GMAIL_READONLY_DEFAULT_MAX_MESSAGES = 25;
export const GMAIL_READONLY_MAX_SAFE_MESSAGE_LIMIT = 50;

const SUPPORTED_RUNTIMES: ReadonlySet<GmailReadOnlyRuntime> = new Set(["nango", "sandbox"]);

const BLOCK_REASON_ORDER: readonly GmailReadOnlyAdapterBlockReason[] = [
  "runtime_not_supported",
  "connection_not_verified",
  "unsafe_message_limit",
  "invalid_time_window",
];

const FORBIDDEN_RESULT_SUBSTRINGS = [
  "access_token",
  "refresh_token",
  "client_secret",
  "authorization_code",
  "providerpayload",
  "rawbody",
  "htmlbody",
  "hangoutlink",
  "meetinglink",
] as const;

const FORBIDDEN_SIGNAL_KEYS = new Set([
  "subject",
  "snippet",
  "body",
  "htmlBody",
  "rawBody",
  "messageId",
  "threadId",
  "from",
  "to",
  "cc",
  "bcc",
  "attachment",
  "attachments",
  "headers",
  "providerPayload",
]);

function sortBlockReasons(reasons: GmailReadOnlyAdapterBlockReason[]): GmailReadOnlyAdapterBlockReason[] {
  const seen = new Set<GmailReadOnlyAdapterBlockReason>();
  const sorted: GmailReadOnlyAdapterBlockReason[] = [];

  for (const reason of BLOCK_REASON_ORDER) {
    if (reasons.includes(reason) && !seen.has(reason)) {
      seen.add(reason);
      sorted.push(reason);
    }
  }

  return sorted;
}

function isValidIsoDate(value: string): boolean {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed);
}

function collectRequestBlockReasons(request: GmailReadOnlyAdapterRequest): GmailReadOnlyAdapterBlockReason[] {
  const reasons: GmailReadOnlyAdapterBlockReason[] = [];

  if (!SUPPORTED_RUNTIMES.has(request.runtime)) {
    reasons.push("runtime_not_supported");
  }

  if (!request.connectionVerified) {
    reasons.push("connection_not_verified");
  }

  const maxMessages = request.window?.maxMessages ?? GMAIL_READONLY_DEFAULT_MAX_MESSAGES;

  if (
    !Number.isInteger(maxMessages) ||
    maxMessages < 1 ||
    maxMessages > GMAIL_READONLY_MAX_SAFE_MESSAGE_LIMIT
  ) {
    reasons.push("unsafe_message_limit");
  }

  const from = request.window?.from;
  const to = request.window?.to;

  if (from != null && !isValidIsoDate(from)) {
    reasons.push("invalid_time_window");
  }

  if (to != null && !isValidIsoDate(to)) {
    reasons.push("invalid_time_window");
  }

  if (from != null && to != null && isValidIsoDate(from) && isValidIsoDate(to)) {
    if (Date.parse(from) > Date.parse(to)) {
      reasons.push("invalid_time_window");
    }
  }

  return sortBlockReasons(reasons);
}

export function createGmailReadOnlyAdapterRequest(input: {
  runtime: GmailReadOnlyRuntime;
  connectionVerified: boolean;
  requestedAt: string;
  window?: {
    from?: string;
    to?: string;
    maxMessages?: number;
  };
}): GmailReadOnlyAdapterRequest {
  return {
    provider: "gmail",
    runtime: input.runtime,
    connectionVerified: input.connectionVerified,
    requestedAt: input.requestedAt,
    window: {
      from: input.window?.from,
      to: input.window?.to,
      maxMessages: input.window?.maxMessages ?? GMAIL_READONLY_DEFAULT_MAX_MESSAGES,
    },
    userReviewRequired: true,
  };
}

export function evaluateGmailReadOnlyAdapterRequest(
  request: GmailReadOnlyAdapterRequest,
): GmailReadOnlyAdapterRequestEvaluation {
  const reasons = collectRequestBlockReasons(request);

  return {
    status: reasons.length > 0 ? "blocked" : "ready",
    request,
    reasons,
  };
}

function defaultMessagesForStatus(status: GmailReadOnlyAdapterStatus): string[] {
  switch (status) {
    case "blocked":
      return ["Gmail read-only adapter request is blocked by safety gates."];
    case "ready":
      return ["Gmail read-only adapter request passed contract validation."];
    case "completed":
      return [
        "Gmail read-only adapter completed with derived signals only. No raw messages were imported or retained.",
      ];
    case "error":
      return ["Gmail read-only adapter failed without importing or retaining raw messages."];
    default: {
      const _exhaustive: never = status;
      return [_exhaustive];
    }
  }
}

export function createGmailReadOnlyAdapterResult(input: {
  runtime: GmailReadOnlyRuntime;
  status: Exclude<GmailReadOnlyAdapterStatus, "blocked">;
  connectionVerified: boolean;
  signals?: GmailDerivedSignal[];
  warnings?: string[];
  messages?: string[];
  processedMessageCount?: number;
}): GmailReadOnlyAdapterResult {
  return {
    provider: "gmail",
    runtime: input.runtime,
    status: input.status,
    safeForClient: true,
    readOnly: true,
    connectionVerified: input.connectionVerified,
    importedRawMessages: false,
    retainedRawPayload: false,
    retainedBodies: false,
    retainedSnippets: false,
    retainedAttachments: false,
    hasToken: false,
    userReviewRequired: true,
    signals: input.signals ?? [],
    warnings: input.warnings ?? [],
    messages: input.messages ?? defaultMessagesForStatus(input.status),
    processedMessageCount: input.processedMessageCount ?? 0,
  };
}

export function createBlockedGmailReadOnlyAdapterResult(input: {
  runtime: GmailReadOnlyRuntime;
  connectionVerified: boolean;
  reasons: GmailReadOnlyAdapterBlockReason[];
  warnings?: string[];
}): GmailReadOnlyAdapterResult {
  const reasonWarnings = input.reasons.map((reason) => `blocked:${reason}`);

  return {
    provider: "gmail",
    runtime: input.runtime,
    status: "blocked",
    safeForClient: true,
    readOnly: true,
    connectionVerified: input.connectionVerified,
    importedRawMessages: false,
    retainedRawPayload: false,
    retainedBodies: false,
    retainedSnippets: false,
    retainedAttachments: false,
    hasToken: false,
    userReviewRequired: true,
    signals: [],
    warnings: [...reasonWarnings, ...(input.warnings ?? [])],
    messages: defaultMessagesForStatus("blocked"),
    processedMessageCount: 0,
  };
}

function isConfidenceInSafeRange(confidence: number): boolean {
  return Number.isFinite(confidence) && confidence >= 0 && confidence <= 1;
}

export function collectGmailReadOnlyAdapterWarnings(result: GmailReadOnlyAdapterResult): string[] {
  const warnings: string[] = [];

  if (result.safeForClient !== true) {
    warnings.push("safeForClient must be true");
  }

  if (result.readOnly !== true) {
    warnings.push("readOnly must be true");
  }

  if (
    result.importedRawMessages !== false ||
    result.retainedRawPayload !== false ||
    result.retainedBodies !== false ||
    result.retainedSnippets !== false ||
    result.retainedAttachments !== false ||
    result.hasToken !== false
  ) {
    warnings.push("raw import/retention and token flags must remain false");
  }

  if (result.userReviewRequired !== true) {
    warnings.push("userReviewRequired must be true");
  }

  for (const signal of result.signals) {
    if (signal.reviewRequired !== true) {
      warnings.push(`signal ${signal.id} must require user review`);
    }

    if (!isConfidenceInSafeRange(signal.confidence)) {
      warnings.push(`signal ${signal.id} confidence must be between 0 and 1`);
    }

    for (const key of Object.keys(signal)) {
      if (FORBIDDEN_SIGNAL_KEYS.has(key)) {
        warnings.push(`signal ${signal.id} contains forbidden field: ${key}`);
      }
    }
  }

  const serialized = JSON.stringify(result).toLowerCase();
  for (const forbidden of FORBIDDEN_RESULT_SUBSTRINGS) {
    if (serialized.includes(forbidden)) {
      warnings.push(`result contains forbidden substring: ${forbidden}`);
    }
  }

  return warnings;
}

export function isGmailReadOnlyAdapterResultSafe(result: GmailReadOnlyAdapterResult): boolean {
  return collectGmailReadOnlyAdapterWarnings(result).length === 0;
}
