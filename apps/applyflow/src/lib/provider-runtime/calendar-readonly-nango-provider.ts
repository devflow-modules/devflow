// Server-only Calendar read-only Nango metadata provider.
// Do not import this file from client components.

import { Nango } from "@nangohq/node";
import type { CalendarEphemeralEventMetadata } from "@devflow/career-sync";
import {
  buildApplyFlowNangoEndUserId,
  NANGO_INTEGRATION_BY_PROVIDER,
} from "./nango-server-provider.js";
import {
  detectCalendarHasConference,
  detectCalendarIsRecurring,
  extractCalendarEmailDomain,
  extractCalendarEmailDomains,
  normalizeCalendarEventEnd,
  normalizeCalendarEventStart,
  normalizeCalendarEventStatus,
} from "./calendar-runtime-normalization.js";

export const CALENDAR_RUNTIME_INTEGRATION_ID = NANGO_INTEGRATION_BY_PROVIDER.calendar;
export const CALENDAR_EVENTS_LIST_ENDPOINT = "/calendar/v3/calendars/primary/events";
export const CALENDAR_EVENTS_LIST_FIELDS =
  "items(start,end,status,attendees,organizer,conferenceData,recurrence),nextPageToken";

export type CalendarNangoRuntimeMetadataProvider = {
  listEventMetadata(input: {
    from?: string;
    to?: string;
    limit: number;
  }): Promise<CalendarEphemeralEventMetadata[]>;
};

export type CalendarNangoRuntimeSdk = {
  listConnections(input: {
    integrationId: string;
    tags: Record<string, string>;
    limit: number;
  }): Promise<{ connections?: Array<Record<string, unknown>> }>;
  get<T>(config: {
    endpoint: string;
    providerConfigKey: string;
    connectionId: string;
    params?: Record<string, string | number | string[]>;
  }): Promise<{ data: T }>;
};

type CalendarEventRaw = {
  id?: string;
  status?: string;
  start?: unknown;
  end?: unknown;
  attendees?: Array<{ email?: string }>;
  organizer?: { email?: string };
  conferenceData?: unknown;
  recurrence?: string[];
  summary?: string;
  description?: string;
  location?: string;
};

type CalendarEventsListResponse = {
  items?: CalendarEventRaw[];
  nextPageToken?: string;
};

function resolveNangoConnectionId(connection: Record<string, unknown> | undefined): string | undefined {
  if (!connection) {
    return undefined;
  }

  const candidate = connection.connection_id ?? connection.connectionId;

  return typeof candidate === "string" && candidate.trim().length > 0 ? candidate.trim() : undefined;
}

function cloneMetadata(item: CalendarEphemeralEventMetadata): CalendarEphemeralEventMetadata {
  return {
    ...item,
    attendeeDomains: [...item.attendeeDomains],
  };
}

function normalizeCalendarEventMetadata(event: CalendarEventRaw): CalendarEphemeralEventMetadata | null {
  const start = normalizeCalendarEventStart(event.start);

  if (!start.startsAt) {
    return null;
  }

  const endsAt = normalizeCalendarEventEnd(event.end, start.isAllDay) ?? start.startsAt;
  const attendeeEmails = (event.attendees ?? []).map((attendee) => attendee.email);
  const attendeeDomains = extractCalendarEmailDomains(attendeeEmails);

  return {
    startsAt: start.startsAt,
    endsAt,
    timezone: start.timezone,
    status: normalizeCalendarEventStatus(event.status),
    isAllDay: start.isAllDay,
    attendeeCount: attendeeEmails.length,
    externalAttendeeCount: 0,
    organizerDomain: extractCalendarEmailDomain(event.organizer?.email),
    attendeeDomains,
    hasConference: detectCalendarHasConference(event.conferenceData),
    isRecurring: detectCalendarIsRecurring(event.recurrence),
  };
}

export function createCalendarNangoRuntimeSdk(secretKey: string): CalendarNangoRuntimeSdk {
  const nango = new Nango({ secretKey });

  return {
    listConnections: (input) => nango.listConnections(input),
    get: (config) => nango.get(config),
  };
}

export function createCalendarNangoRuntimeMetadataProvider(input: {
  secretKey: string;
  endUserId?: string;
  sdk?: CalendarNangoRuntimeSdk;
}): CalendarNangoRuntimeMetadataProvider {
  const endUserId = input.endUserId ?? buildApplyFlowNangoEndUserId("calendar");
  const sdk = input.sdk ?? createCalendarNangoRuntimeSdk(input.secretKey);

  return {
    async listEventMetadata(request) {
      const { connections } = await sdk.listConnections({
        integrationId: CALENDAR_RUNTIME_INTEGRATION_ID,
        tags: { end_user_id: endUserId },
        limit: 1,
      });

      const connectionId = resolveNangoConnectionId(connections?.[0]);

      if (!connectionId) {
        return [];
      }

      const maxResults = Math.max(1, Math.min(request.limit, 50));
      const params: Record<string, string | number | string[]> = {
        maxResults,
        singleEvents: "true",
        orderBy: "startTime",
        fields: CALENDAR_EVENTS_LIST_FIELDS,
      };

      if (request.from) {
        params.timeMin = request.from;
      }

      if (request.to) {
        params.timeMax = request.to;
      }

      const listResponse = await sdk.get<CalendarEventsListResponse>({
        providerConfigKey: CALENDAR_RUNTIME_INTEGRATION_ID,
        connectionId,
        endpoint: CALENDAR_EVENTS_LIST_ENDPOINT,
        params,
      });

      const metadata: CalendarEphemeralEventMetadata[] = [];

      for (const event of listResponse.data.items ?? []) {
        if (metadata.length >= maxResults) {
          break;
        }

        const normalized = normalizeCalendarEventMetadata(event);

        if (normalized) {
          metadata.push(normalized);
        }
      }

      const sorted = [...metadata].sort((left, right) => left.startsAt.localeCompare(right.startsAt));

      return sorted.slice(0, maxResults).map(cloneMetadata);
    },
  };
}
