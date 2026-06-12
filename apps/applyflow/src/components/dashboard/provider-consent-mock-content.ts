/**
 * Static copy for the provider consent mock panel.
 * Read-only roadmap preview — no OAuth, Nango runtime, or provider calls.
 */

export const PROVIDER_CONSENT_MOCK_TITLE = "Provider consent preview";

export const PROVIDER_CONSENT_MOCK_BADGE = "Mock · Read-only · No provider connection";

export const PROVIDER_CONSENT_MOCK_DESCRIPTION =
  "This preview shows the future consent flow for Gmail and Calendar enrichment. No OAuth, Nango runtime, Gmail API, or Calendar API is active.";

export const PROVIDER_CONSENT_MOCK_RUNTIME = "Future Nango adapter";

export type ProviderConsentMockProviderCard = {
  id: "gmail" | "calendar";
  label: string;
  status: string;
  allowedSignals: string;
  neverStored: string;
};

export const PROVIDER_CONSENT_MOCK_PROVIDERS: ProviderConsentMockProviderCard[] = [
  {
    id: "gmail",
    label: "Gmail",
    status: "Not connected",
    allowedSignals: "recruiter screening, follow-up, offer/rejection, company hints",
    neverStored: "raw body, thread ID, message ID, attachments, tokens",
  },
  {
    id: "calendar",
    label: "Calendar",
    status: "Not connected",
    allowedSignals: "interview event, technical stage, company hints, event time",
    neverStored: "descriptions, meeting links, attendee emails, event IDs, tokens",
  },
];

export const PROVIDER_CONSENT_MOCK_ACTIONS = [
  { id: "connect-gmail", label: "Connect Gmail — Coming soon" },
  { id: "connect-calendar", label: "Connect Calendar — Coming soon" },
  { id: "revoke", label: "Revoke access — Coming soon" },
  { id: "delete-derived", label: "Delete derived data — Coming soon" },
] as const;

export const PROVIDER_CONSENT_MOCK_BOUNDARIES = [
  "Consent-based integration only",
  "Raw provider payloads discarded before CareerBundle",
  "No token storage in ApplyFlow",
  "Derived signals only after explicit user review",
] as const;
