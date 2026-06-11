import type { RawGmailMessageLike } from "../shared/types.js";
import type { NangoGmailMessageLike } from "./types.js";

function headerValue(
  headers: Array<{ name: string; value: string }> | undefined,
  name: string,
): string | undefined {
  if (!headers?.length) return undefined;
  const match = headers.find((h) => h.name.toLowerCase() === name.toLowerCase());
  return match?.value?.trim() || undefined;
}

function receivedAtFromHeaders(headers: Array<{ name: string; value: string }> | undefined): string | undefined {
  const raw = headerValue(headers, "Date");
  if (!raw) return undefined;
  const parsed = Date.parse(raw);
  if (Number.isNaN(parsed)) return undefined;
  return new Date(parsed).toISOString();
}

export function mapNangoGmailMessage(input: NangoGmailMessageLike): RawGmailMessageLike {
  const receivedAt = input.date?.trim() || receivedAtFromHeaders(input.payload?.headers);

  return {
    id: input.id,
    from: input.from,
    subject: input.subject,
    snippet: input.snippet,
    receivedAt,
  };
}
