// Server-only Calendar read-only Nango runtime adapter.
// Do not import this file from client components.

import {
  createBlockedCalendarReadOnlyAdapterResult,
  createCalendarReadOnlyAdapterResult,
  evaluateCalendarReadOnlyAdapterRequest,
  CALENDAR_READONLY_DEFAULT_MAX_EVENTS,
  type CalendarReadOnlyAdapter,
  type CalendarReadOnlyAdapterRequest,
  type CalendarReadOnlyAdapterResult,
} from "@devflow/career-sync";
import { deriveCalendarRuntimeSignalsFromMetadata } from "./calendar-runtime-classifier";
import type { CalendarNangoRuntimeMetadataProvider } from "./calendar-readonly-nango-provider";

const COMPLETED_MESSAGE =
  "Calendar metadata was processed through the read-only runtime boundary. No raw event content was retained.";

const ERROR_MESSAGE = "Calendar read-only runtime processing failed safely.";

export function createCalendarReadOnlyNangoRuntimeAdapter(input: {
  metadataProvider: CalendarNangoRuntimeMetadataProvider;
}): CalendarReadOnlyAdapter {
  return {
    async execute(request: CalendarReadOnlyAdapterRequest): Promise<CalendarReadOnlyAdapterResult> {
      if (request.runtime !== "nango") {
        return createBlockedCalendarReadOnlyAdapterResult({
          runtime: request.runtime,
          connectionVerified: request.connectionVerified,
          reasons: ["runtime_not_supported"],
          warnings: ["Calendar read-only Nango runtime adapter accepts nango runtime only."],
        });
      }

      const evaluation = evaluateCalendarReadOnlyAdapterRequest(request);

      if (evaluation.status === "blocked") {
        return createBlockedCalendarReadOnlyAdapterResult({
          runtime: "nango",
          connectionVerified: request.connectionVerified,
          reasons: evaluation.reasons,
        });
      }

      const maxEvents = request.window?.maxEvents ?? CALENDAR_READONLY_DEFAULT_MAX_EVENTS;

      try {
        const metadata = await input.metadataProvider.listEventMetadata({
          from: request.window?.from,
          to: request.window?.to,
          limit: maxEvents,
        });

        const signals = deriveCalendarRuntimeSignalsFromMetadata(metadata);

        return createCalendarReadOnlyAdapterResult({
          runtime: "nango",
          status: "completed",
          connectionVerified: request.connectionVerified,
          signals,
          processedEventCount: metadata.length,
          messages: [COMPLETED_MESSAGE],
        });
      } catch {
        return createCalendarReadOnlyAdapterResult({
          runtime: "nango",
          status: "error",
          connectionVerified: request.connectionVerified,
          warnings: ["calendar_readonly_runtime_processing_failed"],
          messages: [ERROR_MESSAGE],
        });
      }
    },
  };
}
