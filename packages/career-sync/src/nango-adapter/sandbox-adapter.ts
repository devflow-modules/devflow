import {
  assertProviderAdapterResultSafe,
  createProviderAdapterSafetyPolicy,
} from "../provider-adapter/safety.js";
import type {
  ProviderAdapter,
  ProviderKind,
  ProviderNormalizedEvent,
  ProviderNormalizedMessage,
  ProviderSyncRequest,
} from "../provider-adapter/types.js";
import type { NangoSandboxPayload } from "./types.js";

/**
 * Nango sandbox adapter — fake payloads only.
 * Does not use Nango SDK, OAuth, Gmail API, Calendar API, tokens, or network calls.
 */

export type NangoSandboxAdapterOutput = ProviderNormalizedMessage | ProviderNormalizedEvent;

export type NangoSandboxAdapterInput = {
  provider: ProviderKind;
  payloads: NangoSandboxPayload[];
};

function toAdapterSafeId(sandboxId: string): string {
  return sandboxId.startsWith("adapter-") ? sandboxId : `adapter-nango-${sandboxId}`;
}

export function mapNangoSandboxPayloadToProviderNormalized(
  payload: NangoSandboxPayload,
): NangoSandboxAdapterOutput {
  const id = toAdapterSafeId(payload.id);

  if (payload.provider === "gmail") {
    return {
      id,
      provider: "gmail",
      receivedAt: payload.receivedAt,
      subject: payload.subject,
      safeSummary: payload.safeSummary,
      companyHint: payload.companyHint,
      processStageHint: payload.processStageHint,
      actionRequired: payload.actionRequired,
      rawRetained: false,
    };
  }

  return {
    id,
    provider: "calendar",
    eventAt: payload.eventAt,
    title: payload.title,
    safeSummary: payload.safeSummary,
    companyHint: payload.companyHint,
    processStageHint: payload.processStageHint,
    actionRequired: payload.actionRequired,
    rawRetained: false,
    meetingLinkRetained: false,
  };
}

export function createNangoSandboxSyncRequest(
  provider: ProviderKind,
  requestedAt = "2026-06-12T00:00:00.000Z",
): ProviderSyncRequest {
  return {
    provider,
    runtime: "sandbox",
    connection: {
      provider,
      runtime: "sandbox",
      status: "connected",
      connectedAt: requestedAt,
      accountHint: "sandbox-demo",
    },
    consent: {
      consentedAt: requestedAt,
      provider,
      runtime: "sandbox",
      scopes: ["derived-signals-only"],
      userReviewRequired: true,
      canRevoke: true,
      canDeleteDerivedData: true,
    },
    requestedAt,
  };
}

export function createNangoSandboxAdapter(
  input: NangoSandboxAdapterInput,
): ProviderAdapter<NangoSandboxAdapterOutput> {
  const { provider, payloads } = input;

  return {
    provider,
    runtime: "sandbox",
    async sync(request: ProviderSyncRequest) {
      const derived = payloads
        .filter((payload) => payload.provider === request.provider && payload.provider === provider)
        .map(mapNangoSandboxPayloadToProviderNormalized)
        .sort((a, b) => a.id.localeCompare(b.id));

      return assertProviderAdapterResultSafe({
        provider: request.provider,
        runtime: "sandbox",
        derived,
        generatedAt: request.requestedAt,
        safety: createProviderAdapterSafetyPolicy(),
        warnings: [],
      });
    },
  };
}
