import type { ProviderKind } from "@devflow/career-sync";

/**
 * Static copy for the explicit provider consent UI.
 * No OAuth Connect UI, provider import, token storage, or persistence.
 */

export const PROVIDER_CONSENT_CONFIRMATION_TITLE = "Provider connection consent";

export const PROVIDER_CONSENT_CONFIRMATION_BADGE =
  "Explicit consent · Nango Connect UI · No provider data import";

export const PROVIDER_CONSENT_CONFIRMATION_RUNTIME = "Nango";

export const PROVIDER_CONSENT_CONFIRMATION_PROVIDER_OPTIONS: {
  value: ProviderKind;
  label: string;
}[] = [
  { value: "gmail", label: "Gmail" },
  { value: "calendar", label: "Calendar" },
];

export const PROVIDER_CONSENT_CONFIRMATION_SCOPES: Record<ProviderKind, readonly string[]> = {
  gmail: ["gmail.metadata.read"],
  calendar: ["calendar.events.read"],
};

export const PROVIDER_CONSENT_CONFIRMATION_NEVER_STORED: Record<ProviderKind, string> = {
  gmail: "raw body, thread ID, message ID, attachments, tokens",
  calendar: "descriptions, meeting links, attendee emails, event IDs, tokens",
};

export const PROVIDER_CONSENT_CONFIRMATION_BOUNDARIES = [
  "This does not import Gmail or Calendar data.",
  "This does not run background sync.",
  "This does not store OAuth tokens in the browser.",
  "This does not add provider data to CareerBundle.",
  "This does not expose provider tokens to Interview Lab.",
  "Only derived, reviewed signals may be used in future steps.",
  "You can revoke access in a future provider management flow.",
] as const;

export const PROVIDER_CONSENT_CONFIRMATION_CHECKBOX_LABEL =
  "I understand and explicitly consent to start the provider connection flow.";

export const PROVIDER_CONSENT_CONFIRMATION_START_BUTTON_LABEL = "Start provider connection check";

export const PROVIDER_CONSENT_CONFIRMATION_RESULT_TITLE = "Connection launcher result";
