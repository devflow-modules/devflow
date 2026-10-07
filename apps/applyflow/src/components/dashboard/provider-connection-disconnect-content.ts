export const PROVIDER_CONNECTION_DISCONNECT_URL = "/provider-runtime/nango/disconnect";

export const PROVIDER_CONNECTION_DISCONNECT_CONFIRM_TITLE =
  "Disconnect this provider from this account?";

export const PROVIDER_CONNECTION_DISCONNECT_CONFIRM_BODY =
  "This removes the Nango connection for this ApplyFlow account. It does not sign you out, and it does not revoke the app in your Google Account.";

export const PROVIDER_CONNECTION_DISCONNECT_CANCEL_LABEL = "Cancel";
export const PROVIDER_CONNECTION_DISCONNECT_CONFIRM_LABEL = "Disconnect";

export const PROVIDER_CONNECTION_DISCONNECT_GOOGLE_HINT =
  "To revoke the OAuth grant itself, remove the app under Google Account → Security → Third-party connections. Logout, Disconnect, and Google revocation are separate actions.";

export const PROVIDER_CONNECTION_DISCONNECT_LABELS = {
  gmail: "Disconnect Gmail (this account)",
  calendar: "Disconnect Calendar (this account)",
} as const;

export const PROVIDER_CONNECTION_DISCONNECT_SUCCESS_LABELS = {
  gmail: "Gmail disconnected for this account",
  calendar: "Calendar disconnected for this account",
} as const;
