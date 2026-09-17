import type { InboundEmail } from "@devflow/applyflow-core";
import { evaluateProviderRuntimeFlags } from "@devflow/career-sync";
import {
  createGmailNangoRuntimeMetadataProvider,
  type GmailClosedLoopInboundEmail,
  type GmailNangoRuntimeMetadataProvider,
} from "./gmail-readonly-nango-provider";
import { buildApplyFlowNangoEndUserId } from "./nango-server-provider";
import {
  envToProviderRuntimeFlags,
  type ApplyFlowNangoConnectSessionEnv,
} from "./nango-connect-session-boundary";
import {
  handleApplyFlowNangoConnectionVerification,
  parseConnectionVerificationExplicitConsent,
  type ApplyFlowNangoConnectionVerificationDeps,
} from "./nango-connection-verification-boundary";

export const GMAIL_CLOSED_LOOP_INBOUND_MAX = 50;
export const GMAIL_CLOSED_LOOP_INBOUND_DEFAULT = 20;

export type GmailClosedLoopInboundResult = {
  runtime: "nango";
  status: "completed" | "blocked" | "error";
  safeForClient: true;
  readOnly: true;
  userReviewRequired: true;
  importedRawProviderData: false;
  retainedRawPayload: false;
  retainedBodies: false;
  retainedHtml: false;
  hasToken: false;
  emails: InboundEmail[];
  accountScopes: string[];
  processedMessageCount: number;
  warnings: string[];
  messages: string[];
};

function blocked(warnings: string[], messages: string[]): GmailClosedLoopInboundResult {
  return {
    runtime: "nango",
    status: "blocked",
    safeForClient: true,
    readOnly: true,
    userReviewRequired: true,
    importedRawProviderData: false,
    retainedRawPayload: false,
    retainedBodies: false,
    retainedHtml: false,
    hasToken: false,
    emails: [],
    accountScopes: [],
    processedMessageCount: 0,
    warnings,
    messages,
  };
}

function toInboundEmail(item: GmailClosedLoopInboundEmail): InboundEmail {
  return {
    id: item.id,
    receivedAt: item.receivedAt,
    senderDomain: item.senderDomain,
    accountScope: item.accountScope,
    legacyId: item.legacyId,
    ...(item.subject ? { subject: item.subject } : {}),
    ...(item.snippet ? { snippet: item.snippet } : {}),
  };
}

function isAccountScope(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{32}$/.test(value);
}

export function parseGmailClosedLoopInboundRequest(body: unknown):
  | { ok: true; explicitConsent: true; limit: number; accountScope?: string }
  | {
      ok: false;
      error: "invalid_json" | "missing_consent" | "invalid_limits" | "invalid_account_scope";
      httpStatus: 400 | 403;
    } {
  if (body == null || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "invalid_json", httpStatus: 400 };
  }
  const record = body as Record<string, unknown>;
  if (record.explicitConsent !== true) {
    return { ok: false, error: "missing_consent", httpStatus: 403 };
  }
  const limit = typeof record.limit === "number" ? record.limit : GMAIL_CLOSED_LOOP_INBOUND_DEFAULT;
  if (!Number.isInteger(limit) || limit < 1 || limit > GMAIL_CLOSED_LOOP_INBOUND_MAX) {
    return { ok: false, error: "invalid_limits", httpStatus: 400 };
  }
  if (record.accountScope !== undefined && !isAccountScope(record.accountScope)) {
    return { ok: false, error: "invalid_account_scope", httpStatus: 400 };
  }
  return {
    ok: true,
    explicitConsent: true,
    limit,
    ...(isAccountScope(record.accountScope) ? { accountScope: record.accountScope } : {}),
  };
}

export async function handleGmailClosedLoopInboundScan(input: {
  env: ApplyFlowNangoConnectSessionEnv;
  requestedAt: string;
  limit: number;
  explicitConsent: true;
  accountScope?: string;
  callerNonce?: string;
  verificationDeps?: ApplyFlowNangoConnectionVerificationDeps;
  metadataProvider?: GmailNangoRuntimeMetadataProvider;
}): Promise<GmailClosedLoopInboundResult> {
  if (!parseConnectionVerificationExplicitConsent(true)) {
    return blocked(["missing_consent"], ["Explicit consent is required."]);
  }

  const flags = evaluateProviderRuntimeFlags(envToProviderRuntimeFlags(input.env));
  if (!flags.careerProviderRuntimeEnabled || !flags.canUseNangoRuntime || !flags.canUseGmailProvider) {
    return blocked(["provider_runtime_disabled"], ["Gmail read-only runtime is disabled."]);
  }
  if (!input.env.NANGO_SECRET_KEY?.trim()) {
    return blocked(["missing_nango_secret"], ["Nango secret key is required server-side."]);
  }

  const verification = await handleApplyFlowNangoConnectionVerification(
    { provider: "gmail", explicitConsent: true },
    {
      env: input.env,
      requestedAt: input.requestedAt,
      verificationDeps: input.verificationDeps ?? {},
    },
  );
  if (verification.state !== "connected") {
    return blocked(["gmail_connection_not_verified"], ["Gmail connection is not verified."]);
  }

  const provider =
    input.metadataProvider ??
    (input.callerNonce
      ? createGmailNangoRuntimeMetadataProvider({
          secretKey: input.env.NANGO_SECRET_KEY,
          endUserId: buildApplyFlowNangoEndUserId("gmail", input.callerNonce),
        })
      : undefined);
  if (!provider) {
    return blocked(["missing_caller_session"], ["A caller session is required before reading Gmail."]);
  }
  if (!provider.listInboundEmails) {
    return blocked(["inbound_scan_unavailable"], ["Closed-loop Gmail scan is unavailable."]);
  }

  try {
    const listed = await provider.listInboundEmails({
      limit: input.limit,
      ...(input.accountScope ? { accountScope: input.accountScope } : {}),
    });
    if (listed.needsAccountSelection) {
      return {
        ...blocked(
          ["need_account_selection"],
          ["Select the Gmail account to read. Mailboxes are not mixed."],
        ),
        accountScopes: listed.accountScopes,
      };
    }
    return {
      runtime: "nango",
      status: "completed",
      safeForClient: true,
      readOnly: true,
      userReviewRequired: true,
      importedRawProviderData: false,
      retainedRawPayload: false,
      retainedBodies: false,
      retainedHtml: false,
      hasToken: false,
      emails: listed.emails.map(toInboundEmail),
      accountScopes: listed.accountScopes,
      processedMessageCount: listed.emails.length,
      warnings: [],
      messages: ["Gmail closed-loop scan used metadata format only. No messages were modified."],
    };
  } catch {
    return {
      runtime: "nango",
      status: "error",
      safeForClient: true,
      readOnly: true,
      userReviewRequired: true,
      importedRawProviderData: false,
      retainedRawPayload: false,
      retainedBodies: false,
      retainedHtml: false,
      hasToken: false,
      emails: [],
      accountScopes: [],
      processedMessageCount: 0,
      warnings: ["gmail_closed_loop_scan_failed"],
      messages: ["Gmail closed-loop scan failed safely. No Gmail writes were attempted."],
    };
  }
}
