import type { ProviderKind } from "@devflow/career-sync";

/**
 * Static copy for the explicit provider consent UI.
 * No OAuth Connect UI, provider import, token storage, or persistence.
 *
 * Ownership (AF-NANGO-001): browser/device-scoped pilot identity — not ApplyFlowAccount.
 */

export const PROVIDER_CONSENT_CONFIRMATION_TITLE = "Provider connection consent";

export const PROVIDER_CONSENT_CONFIRMATION_BADGE =
  "Explicit consent · This browser · Nango Connect · No provider data import";

export const PROVIDER_CONSENT_CONFIRMATION_RUNTIME = "Nango";

/** Short ownership notice shown near the consent flow (pilot contract). */
export const PROVIDER_CONSENT_CONFIRMATION_OWNERSHIP_NOTICE =
  "Provider connections in this pilot are available to this browser session/device and are not linked to your ApplyFlow account. Signing out of ApplyFlow does not disconnect Gmail or Calendar. Using another ApplyFlow account in the same browser keeps the same provider connection until you disconnect or clear this browser’s provider session.";

export const PROVIDER_CONSENT_CONFIRMATION_PROVIDER_OPTIONS: {
  value: ProviderKind;
  label: string;
}[] = [
  { value: "gmail", label: "Gmail (this browser)" },
  { value: "calendar", label: "Calendar (this browser)" },
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
  "This connection is browser/device-scoped for the current pilot — not linked to your ApplyFlow account.",
  "Connecting on another device or browser profile does not reuse this connection.",
  "ApplyFlow logout does not disconnect the provider or revoke Google access.",
  "This does not import Gmail or Calendar data.",
  "This does not run background sync.",
  "This does not store OAuth tokens in the browser.",
  "This does not add provider data to CareerBundle.",
  "This does not expose provider tokens to Interview Lab.",
  "Only derived, reviewed signals may be used in future steps.",
  "Use Disconnect here to remove the Nango connection for this browser; revoke the Google grant separately if needed.",
] as const;

export const PROVIDER_CONSENT_CONFIRMATION_CHECKBOX_LABEL =
  "I understand this is a browser-scoped pilot connection and explicitly consent to start the provider flow.";

export const PROVIDER_CONSENT_CONFIRMATION_START_BUTTON_LABEL = "Start provider connection check";
export const PROVIDER_CONSENT_CONFIRMATION_GMAIL_DISABLED =
  "Gmail runtime is disabled on this deployment. The start button stays off until the server flags are enabled.";

export const PROVIDER_CONSENT_CONFIRMATION_RESULT_TITLE = "Connection launcher result";
