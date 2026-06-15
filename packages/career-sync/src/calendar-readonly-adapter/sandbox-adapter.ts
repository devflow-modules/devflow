import {
  CALENDAR_READONLY_DEFAULT_MAX_EVENTS,
  createBlockedCalendarReadOnlyAdapterResult,
  createCalendarReadOnlyAdapterResult,
  evaluateCalendarReadOnlyAdapterRequest,
} from "./contract.js";
import { deriveCalendarSignalsFromSandboxEvents } from "./sandbox-classifier.js";
import type {
  CalendarSandboxFixture,
  CalendarSandboxFixtureEvent,
  CalendarSandboxScenarioProvider,
} from "./sandbox-types.js";
import type {
  CalendarEphemeralEventMetadata,
  CalendarReadOnlyAdapter,
  CalendarReadOnlyAdapterRequest,
  CalendarReadOnlyAdapterResult,
  CalendarReadOnlyMetadataProvider,
} from "./types.js";

function cloneFixtureEvent(event: CalendarSandboxFixtureEvent): CalendarSandboxFixtureEvent {
  return {
    scenario: event.scenario,
    companySlug: event.companySlug,
    metadata: {
      ...event.metadata,
      attendeeDomains: [...event.metadata.attendeeDomains],
    },
  };
}

function cloneMetadata(metadata: CalendarEphemeralEventMetadata): CalendarEphemeralEventMetadata {
  return {
    ...metadata,
    attendeeDomains: [...metadata.attendeeDomains],
  };
}

function filterEventsByWindow(
  events: CalendarSandboxFixtureEvent[],
  from?: string,
  to?: string,
): CalendarSandboxFixtureEvent[] {
  return events.filter((event) => {
    const startsAt = Date.parse(event.metadata.startsAt);
    if (!Number.isFinite(startsAt)) {
      return false;
    }

    if (from != null && startsAt < Date.parse(from)) {
      return false;
    }

    if (to != null && startsAt > Date.parse(to)) {
      return false;
    }

    return true;
  });
}

export function createCalendarSandboxScenarioProvider(
  fixture: CalendarSandboxFixture,
): CalendarSandboxScenarioProvider {
  return {
    async listSandboxEvents(input) {
      const filtered = filterEventsByWindow(fixture.events, input.from, input.to);
      const sorted = [...filtered].sort((left, right) =>
        left.metadata.startsAt.localeCompare(right.metadata.startsAt),
      );
      const limited = sorted.slice(0, Math.max(0, input.limit));

      return limited.map(cloneFixtureEvent);
    },
  };
}

export function createCalendarSandboxMetadataProvider(
  fixture: CalendarSandboxFixture,
): CalendarReadOnlyMetadataProvider {
  const scenarioProvider = createCalendarSandboxScenarioProvider(fixture);

  return {
    async listEventMetadata(input) {
      const events = await scenarioProvider.listSandboxEvents(input);
      return events.map((event) => cloneMetadata(event.metadata));
    },
  };
}

export function createCalendarReadOnlySandboxAdapter(input: {
  fixtureProvider: CalendarSandboxScenarioProvider;
}): CalendarReadOnlyAdapter {
  return {
    async execute(request: CalendarReadOnlyAdapterRequest): Promise<CalendarReadOnlyAdapterResult> {
      if (request.runtime !== "sandbox") {
        return createBlockedCalendarReadOnlyAdapterResult({
          runtime: request.runtime,
          connectionVerified: request.connectionVerified,
          reasons: ["runtime_not_supported"],
          warnings: ["Calendar read-only sandbox adapter accepts sandbox runtime only."],
        });
      }

      const evaluation = evaluateCalendarReadOnlyAdapterRequest(request);

      if (evaluation.status === "blocked") {
        return createBlockedCalendarReadOnlyAdapterResult({
          runtime: "sandbox",
          connectionVerified: request.connectionVerified,
          reasons: evaluation.reasons,
        });
      }

      const maxEvents = request.window?.maxEvents ?? CALENDAR_READONLY_DEFAULT_MAX_EVENTS;

      try {
        const events = await input.fixtureProvider.listSandboxEvents({
          from: request.window?.from,
          to: request.window?.to,
          limit: maxEvents,
        });

        const signals = deriveCalendarSignalsFromSandboxEvents(events);

        return createCalendarReadOnlyAdapterResult({
          runtime: "sandbox",
          status: "completed",
          connectionVerified: request.connectionVerified,
          signals,
          processedEventCount: events.length,
          messages: [
            "Calendar read-only sandbox adapter completed with derived signals only. No raw events were imported or retained.",
          ],
        });
      } catch {
        return createCalendarReadOnlyAdapterResult({
          runtime: "sandbox",
          status: "error",
          connectionVerified: request.connectionVerified,
          warnings: ["sandbox_event_metadata_processing_failed"],
          messages: ["Sandbox event metadata processing failed safely."],
        });
      }
    },
  };
}
