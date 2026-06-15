import {
  createBlockedGmailReadOnlyAdapterResult,
  createGmailReadOnlyAdapterResult,
  evaluateGmailReadOnlyAdapterRequest,
  GMAIL_READONLY_DEFAULT_MAX_MESSAGES,
} from "./contract.js";
import { deriveGmailSignalsFromEphemeralMetadata } from "./sandbox-classifier.js";
import type { GmailSandboxFixture } from "./sandbox-types.js";
import type {
  GmailEphemeralMessageMetadata,
  GmailReadOnlyAdapter,
  GmailReadOnlyAdapterRequest,
  GmailReadOnlyAdapterResult,
  GmailReadOnlyMetadataProvider,
} from "./types.js";

function cloneMetadata(item: GmailEphemeralMessageMetadata): GmailEphemeralMessageMetadata {
  return {
    ...item,
    recipientDomains: [...item.recipientDomains],
    labels: item.labels ? [...item.labels] : undefined,
  };
}

function filterMetadataByWindow(
  metadata: GmailEphemeralMessageMetadata[],
  from?: string,
  to?: string,
): GmailEphemeralMessageMetadata[] {
  return metadata.filter((item) => {
    const occurredAt = Date.parse(item.occurredAt);
    if (!Number.isFinite(occurredAt)) {
      return false;
    }

    if (from != null && occurredAt < Date.parse(from)) {
      return false;
    }

    if (to != null && occurredAt > Date.parse(to)) {
      return false;
    }

    return true;
  });
}

export function createGmailSandboxMetadataProvider(
  fixture: GmailSandboxFixture,
): GmailReadOnlyMetadataProvider {
  return {
    async listMessageMetadata(input) {
      const filtered = filterMetadataByWindow(fixture.metadata, input.from, input.to);
      const sorted = [...filtered].sort((left, right) => left.occurredAt.localeCompare(right.occurredAt));
      const limited = sorted.slice(0, Math.max(0, input.limit));

      return limited.map(cloneMetadata);
    },
  };
}

export function createGmailReadOnlySandboxAdapter(input: {
  metadataProvider: GmailReadOnlyMetadataProvider;
}): GmailReadOnlyAdapter {
  return {
    async execute(request: GmailReadOnlyAdapterRequest): Promise<GmailReadOnlyAdapterResult> {
      if (request.runtime !== "sandbox") {
        return createBlockedGmailReadOnlyAdapterResult({
          runtime: request.runtime,
          connectionVerified: request.connectionVerified,
          reasons: ["runtime_not_supported"],
          warnings: ["Gmail read-only sandbox adapter accepts sandbox runtime only."],
        });
      }

      const evaluation = evaluateGmailReadOnlyAdapterRequest(request);

      if (evaluation.status === "blocked") {
        return createBlockedGmailReadOnlyAdapterResult({
          runtime: "sandbox",
          connectionVerified: request.connectionVerified,
          reasons: evaluation.reasons,
        });
      }

      const maxMessages = request.window?.maxMessages ?? GMAIL_READONLY_DEFAULT_MAX_MESSAGES;

      try {
        const metadata = await input.metadataProvider.listMessageMetadata({
          from: request.window?.from,
          to: request.window?.to,
          limit: maxMessages,
        });

        const signals = deriveGmailSignalsFromEphemeralMetadata(metadata);

        return createGmailReadOnlyAdapterResult({
          runtime: "sandbox",
          status: "completed",
          connectionVerified: request.connectionVerified,
          signals,
          processedMessageCount: metadata.length,
          messages: [
            "Gmail read-only sandbox adapter completed with derived signals only. No raw messages were imported or retained.",
          ],
        });
      } catch {
        return createGmailReadOnlyAdapterResult({
          runtime: "sandbox",
          status: "error",
          connectionVerified: request.connectionVerified,
          warnings: ["sandbox_metadata_processing_failed"],
          messages: ["Sandbox metadata processing failed safely."],
        });
      }
    },
  };
}
