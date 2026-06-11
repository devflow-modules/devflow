import type { RawCalendarEventLike } from "../shared/types.js";
import type { NangoCalendarEventLike } from "./types.js";

function resolveEventTime(value: { dateTime?: string; date?: string } | undefined): string | undefined {
  if (!value) return undefined;
  const dateTime = value.dateTime?.trim();
  if (dateTime) return dateTime;
  const date = value.date?.trim();
  if (date) return date;
  return undefined;
}

export function mapNangoCalendarEvent(input: NangoCalendarEventLike): RawCalendarEventLike {
  return {
    id: input.id,
    summary: input.summary,
    description: input.description,
    start: resolveEventTime(input.start),
    end: resolveEventTime(input.end),
  };
}
