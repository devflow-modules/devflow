// Server-only Gmail read-only Nango runtime adapter.
// Do not import this file from client components.

import {
  createBlockedGmailReadOnlyAdapterResult,
  createGmailReadOnlyAdapterResult,
  evaluateGmailReadOnlyAdapterRequest,
  GMAIL_READONLY_DEFAULT_MAX_MESSAGES,
  type GmailEphemeralMessageMetadata,
  type GmailReadOnlyAdapter,
  type GmailReadOnlyAdapterRequest,
  type GmailReadOnlyAdapterResult,
} from "@devflow/career-sync";
import { deriveGmailRuntimeSignalsFromMetadata } from "./gmail-runtime-classifier";
import type { GmailNangoRuntimeMetadataProvider } from "./gmail-readonly-nango-provider";

const COMPLETED_MESSAGE =
  "Gmail metadata was processed through the read-only runtime boundary. No raw message content was retained.";

const ERROR_MESSAGE = "Gmail read-only runtime processing failed safely.";

export type GmailReadOnlyNangoRuntimeExecution = {
  result: GmailReadOnlyAdapterResult;
  metadata: GmailEphemeralMessageMetadata[];
};

export async function executeGmailReadOnlyNangoRuntime(input: {
  metadataProvider: GmailNangoRuntimeMetadataProvider;
  request: GmailReadOnlyAdapterRequest;
}): Promise<GmailReadOnlyNangoRuntimeExecution> {
  const { request } = input;

  if (request.runtime !== "nango") {
    return {
      result: createBlockedGmailReadOnlyAdapterResult({
        runtime: request.runtime,
        connectionVerified: request.connectionVerified,
        reasons: ["runtime_not_supported"],
        warnings: ["Gmail read-only Nango runtime adapter accepts nango runtime only."],
      }),
      metadata: [],
    };
  }

  const evaluation = evaluateGmailReadOnlyAdapterRequest(request);

  if (evaluation.status === "blocked") {
    return {
      result: createBlockedGmailReadOnlyAdapterResult({
        runtime: "nango",
        connectionVerified: request.connectionVerified,
        reasons: evaluation.reasons,
      }),
      metadata: [],
    };
  }

  const maxMessages = request.window?.maxMessages ?? GMAIL_READONLY_DEFAULT_MAX_MESSAGES;

  try {
    const metadata = await input.metadataProvider.listMessageMetadata({
      from: request.window?.from,
      to: request.window?.to,
      limit: maxMessages,
    });

    const signals = deriveGmailRuntimeSignalsFromMetadata(metadata);

    return {
      result: createGmailReadOnlyAdapterResult({
        runtime: "nango",
        status: "completed",
        connectionVerified: request.connectionVerified,
        signals,
        processedMessageCount: metadata.length,
        messages: [COMPLETED_MESSAGE],
      }),
      metadata,
    };
  } catch {
    return {
      result: createGmailReadOnlyAdapterResult({
        runtime: "nango",
        status: "error",
        connectionVerified: request.connectionVerified,
        warnings: ["gmail_readonly_runtime_processing_failed"],
        messages: [ERROR_MESSAGE],
      }),
      metadata: [],
    };
  }
}

export function createGmailReadOnlyNangoRuntimeAdapter(input: {
  metadataProvider: GmailNangoRuntimeMetadataProvider;
}): GmailReadOnlyAdapter {
  return {
    async execute(request: GmailReadOnlyAdapterRequest): Promise<GmailReadOnlyAdapterResult> {
      const execution = await executeGmailReadOnlyNangoRuntime({
        metadataProvider: input.metadataProvider,
        request,
      });

      return execution.result;
    },
  };
}
