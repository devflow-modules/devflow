import type { ProviderConnectionActionKind, ProviderKind } from "@devflow/career-sync";

/**
 * Static copy for the provider consent mock panel.
 * Read-only roadmap preview — no OAuth, Nango runtime, or provider calls.
 */

export const PROVIDER_CONSENT_MOCK_TITLE = "Provider consent preview";

export const PROVIDER_CONSENT_MOCK_BADGE = "Mock · Read-only · No provider connection";

export const PROVIDER_CONSENT_MOCK_DESCRIPTION =
  "This preview shows the future consent flow for Gmail and Calendar enrichment. No OAuth, Nango runtime, Gmail API, or Calendar API is active.";

export const PROVIDER_CONSENT_MOCK_RUNTIME = "Future Nango adapter";

export const PROVIDER_CONSENT_MOCK_ACTIONS = [
  {
    id: "preview-connect-gmail",
    label: "Connect Gmail — Preview only",
    action: "connect" satisfies ProviderConnectionActionKind,
    provider: "gmail" satisfies ProviderKind,
  },
  {
    id: "preview-connect-calendar",
    label: "Connect Calendar — Preview only",
    action: "connect" satisfies ProviderConnectionActionKind,
    provider: "calendar" satisfies ProviderKind,
  },
  {
    id: "preview-revoke",
    label: "Revoke access — Preview only",
    action: "revoke" satisfies ProviderConnectionActionKind,
    provider: "gmail" satisfies ProviderKind,
  },
  {
    id: "preview-delete-derived",
    label: "Delete derived data — Preview only",
    action: "delete_derived_data" satisfies ProviderConnectionActionKind,
    provider: "gmail" satisfies ProviderKind,
  },
] as const;

export const PROVIDER_CONSENT_MOCK_BOUNDARIES = [
  "Consent-based integration only",
  "Raw provider payloads discarded before CareerBundle",
  "No token storage in ApplyFlow",
  "Derived signals only after explicit user review",
] as const;
