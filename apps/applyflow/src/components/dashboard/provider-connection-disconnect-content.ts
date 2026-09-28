export const PROVIDER_CONNECTION_DISCONNECT_URL = "/provider-runtime/nango/disconnect";

export const PROVIDER_CONNECTION_DISCONNECT_CONFIRM_TITLE =
  "Disconnect this provider from this browser?";

export const PROVIDER_CONNECTION_DISCONNECT_CONFIRM_BODY =
  "This removes the Nango connection for this browser’s provider session. It does not sign you out of ApplyFlow, and it does not necessarily revoke the app directly in your Google Account.";

export const PROVIDER_CONNECTION_DISCONNECT_CANCEL_LABEL = "Cancel";
export const PROVIDER_CONNECTION_DISCONNECT_CONFIRM_LABEL = "Disconnect";

export const PROVIDER_CONNECTION_DISCONNECT_GOOGLE_HINT =
  "To revoke the OAuth grant itself, remove the app under Google Account → Security → Third-party connections. Clearing this browser’s provider session is also different from Disconnect — a lost session may leave an orphaned Nango connection until you reconnect or revoke in Google.";

export const PROVIDER_CONNECTION_DISCONNECT_LABELS = {
  gmail: "Disconnect Gmail (this browser)",
  calendar: "Disconnect Calendar (this browser)",
} as const;

export const PROVIDER_CONNECTION_DISCONNECT_SUCCESS_LABELS = {
  gmail: "Gmail disconnected for this browser",
  calendar: "Calendar disconnected for this browser",
} as const;
