// Server-only Gmail read-only Nango runtime adapter.
// Do not import this file from client components.

import {
  createBlockedGmailReadOnlyAdapterResult,
  createGmailReadOnlyAdapterResult,
  evaluateGmailReadOnlyAdapterRequest,
  GMAIL_READONLY_DEFAULT_MAX_MESSAGES,
  type GmailReadOnlyAdapter,
  type GmailReadOnlyAdapterRequest,
  type GmailReadOnlyAdapterResult,
} from "@devflow/career-sync";
import { deriveGmailRuntimeSignalsFromMetadata } from "./gmail-runtime-classifier.js";
import type { GmailNangoRuntimeMetadataProvider } from "./gmail-readonly-nango-provider.js";

const COMPLETED_MESSAGE =
  "Gmail metadata was processed through the read-only runtime boundary. No raw message content was retained.";

const ERROR_MESSAGE = "Gmail read-only runtime processing failed safely.";

export function createGmailReadOnlyNangoRuntimeAdapter(input: {
  metadataProvider: GmailNangoRuntimeMetadataProvider;
}): GmailReadOnlyAdapter {
  return {
    async execute(request: GmailReadOnlyAdapterRequest): Promise<GmailReadOnlyAdapterResult> {
      if (request.runtime !== "nango") {
        return createBlockedGmailReadOnlyAdapterResult({
          runtime: request.runtime,
          connectionVerified: request.connectionVerified,
          reasons: ["runtime_not_supported"],
          warnings: ["Gmail read-only Nango runtime adapter accepts nango runtime only."],
        });
      }

      const evaluation = evaluateGmailReadOnlyAdapterRequest(request);

      if (evaluation.status === "blocked") {
        return createBlockedGmailReadOnlyAdapterResult({
          runtime: "nango",
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

        const signals = deriveGmailRuntimeSignalsFromMetadata(metadata);

        return createGmailReadOnlyAdapterResult({
          runtime: "nango",
          status: "completed",
          connectionVerified: request.connectionVerified,
          signals,
          processedMessageCount: metadata.length,
          messages: [COMPLETED_MESSAGE],
        });
      } catch {
        return createGmailReadOnlyAdapterResult({
          runtime: "nango",
          status: "error",
          connectionVerified: request.connectionVerified,
          warnings: ["gmail_readonly_runtime_processing_failed"],
          messages: [ERROR_MESSAGE],
        });
      }
    },
  };
}
