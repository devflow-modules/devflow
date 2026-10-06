import type { ProviderKind } from "@devflow/career-sync";

/**
 * Static copy for the explicit provider consent UI.
 * Ownership is the authenticated ApplyFlow account. Browser cookies are not the owner.
 * Logout does not disconnect. Disconnect does not revoke the Google OAuth grant.
 */

export const PROVIDER_CONSENT_CONFIRMATION_TITLE = "Provider connection consent";

export const PROVIDER_CONSENT_CONFIRMATION_BADGE =
  "Explicit consent · This account · Nango Connect · No provider data import";

export const PROVIDER_CONSENT_CONFIRMATION_RUNTIME = "Nango";

export const PROVIDER_CONSENT_CONFIRMATION_OWNERSHIP_NOTICE =
  "Gmail and Calendar connections belong to your signed-in ApplyFlow account. An older browser-only connection is not attached automatically — use Connect again to create the account connection. Signing out does not disconnect the provider. Disconnect removes the Nango connection for this account and does not revoke the Google grant by itself.";

export const PROVIDER_CONSENT_CONFIRMATION_PROVIDER_OPTIONS: {
  value: ProviderKind;
  label: string;
}[] = [
  { value: "gmail", label: "Gmail (this account)" },
  { value: "calendar", label: "Calendar (this account)" },
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
  "This connection belongs to the signed-in ApplyFlow account.",
  "A previous browser-only connection is not reused. Connect again to attach this account.",
  "The same account can reconnect on another device; a different account does not see this connection.",
  "ApplyFlow logout does not disconnect the provider or revoke Google access.",
  "This does not import Gmail or Calendar data.",
  "This does not run background sync.",
  "This does not store OAuth tokens in the browser.",
  "This does not add provider data to CareerBundle.",
  "This does not expose provider tokens to Interview Lab.",
  "Only derived, reviewed signals may be used in future steps.",
  "Use Disconnect to remove the Nango connection for this account. Revoke the Google grant separately in Google Account settings.",
] as const;

export const PROVIDER_CONSENT_CONFIRMATION_CHECKBOX_LABEL =
  "I understand this connection belongs to my ApplyFlow account and explicitly consent to start the provider flow.";

export const PROVIDER_CONSENT_CONFIRMATION_START_BUTTON_LABEL = "Start provider connection check";
export const PROVIDER_CONSENT_CONFIRMATION_GMAIL_DISABLED =
  "Gmail runtime is disabled on this deployment. The start button stays off until the server flags are enabled.";

export const PROVIDER_CONSENT_CONFIRMATION_RESULT_TITLE = "Connection launcher result";
