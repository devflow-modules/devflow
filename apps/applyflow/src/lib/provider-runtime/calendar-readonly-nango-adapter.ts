// Server-only Calendar read-only Nango runtime adapter.
// Do not import this file from client components.

import {
  createBlockedCalendarReadOnlyAdapterResult,
  createCalendarReadOnlyAdapterResult,
  evaluateCalendarReadOnlyAdapterRequest,
  CALENDAR_READONLY_DEFAULT_MAX_EVENTS,
  type CalendarEphemeralEventMetadata,
  type CalendarReadOnlyAdapter,
  type CalendarReadOnlyAdapterRequest,
  type CalendarReadOnlyAdapterResult,
} from "@devflow/career-sync";
import { deriveCalendarRuntimeSignalsFromMetadata } from "./calendar-runtime-classifier";
import type { CalendarNangoRuntimeMetadataProvider } from "./calendar-readonly-nango-provider";

const COMPLETED_MESSAGE =
  "Calendar metadata was processed through the read-only runtime boundary. No raw event content was retained.";

const ERROR_MESSAGE = "Calendar read-only runtime processing failed safely.";

export type CalendarReadOnlyNangoRuntimeExecution = {
  result: CalendarReadOnlyAdapterResult;
  metadata: CalendarEphemeralEventMetadata[];
};

export async function executeCalendarReadOnlyNangoRuntime(input: {
  metadataProvider: CalendarNangoRuntimeMetadataProvider;
  request: CalendarReadOnlyAdapterRequest;
}): Promise<CalendarReadOnlyNangoRuntimeExecution> {
  const { request } = input;

  if (request.runtime !== "nango") {
    return {
      result: createBlockedCalendarReadOnlyAdapterResult({
        runtime: request.runtime,
        connectionVerified: request.connectionVerified,
        reasons: ["runtime_not_supported"],
        warnings: ["Calendar read-only Nango runtime adapter accepts nango runtime only."],
      }),
      metadata: [],
    };
  }

  const evaluation = evaluateCalendarReadOnlyAdapterRequest(request);

  if (evaluation.status === "blocked") {
    return {
      result: createBlockedCalendarReadOnlyAdapterResult({
        runtime: "nango",
        connectionVerified: request.connectionVerified,
        reasons: evaluation.reasons,
      }),
      metadata: [],
    };
  }

  const maxEvents = request.window?.maxEvents ?? CALENDAR_READONLY_DEFAULT_MAX_EVENTS;

  try {
    const metadata = await input.metadataProvider.listEventMetadata({
      from: request.window?.from,
      to: request.window?.to,
      limit: maxEvents,
    });

    const signals = deriveCalendarRuntimeSignalsFromMetadata(metadata);

    return {
      result: createCalendarReadOnlyAdapterResult({
        runtime: "nango",
        status: "completed",
        connectionVerified: request.connectionVerified,
        signals,
        processedEventCount: metadata.length,
        messages: [COMPLETED_MESSAGE],
      }),
      metadata,
    };
  } catch {
    return {
      result: createCalendarReadOnlyAdapterResult({
        runtime: "nango",
        status: "error",
        connectionVerified: request.connectionVerified,
        warnings: ["calendar_readonly_runtime_processing_failed"],
        messages: [ERROR_MESSAGE],
      }),
      metadata: [],
    };
  }
}

export function createCalendarReadOnlyNangoRuntimeAdapter(input: {
  metadataProvider: CalendarNangoRuntimeMetadataProvider;
}): CalendarReadOnlyAdapter {
  return {
    async execute(request: CalendarReadOnlyAdapterRequest): Promise<CalendarReadOnlyAdapterResult> {
      const execution = await executeCalendarReadOnlyNangoRuntime({
        metadataProvider: input.metadataProvider,
        request,
      });

      return execution.result;
    },
  };
}
