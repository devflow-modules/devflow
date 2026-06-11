import {
  EMAIL_PATTERN,
  MEETING_LINK_PATTERN,
  PHONE_PATTERN,
  URL_PATTERN,
} from "./filters.js";

export function redactSensitiveText(input: string): string {
  let out = input;
  out = out.replace(MEETING_LINK_PATTERN, "[meeting-link-redacted]");
  out = out.replace(URL_PATTERN, "[link-redacted]");
  out = out.replace(EMAIL_PATTERN, "[email-redacted]");
  out = out.replace(PHONE_PATTERN, "[phone-redacted]");
  return out.replace(/\s+/g, " ").trim();
}
