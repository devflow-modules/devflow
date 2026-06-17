export const PROVIDER_CONNECTION_DISCONNECT_URL = "/provider-runtime/nango/disconnect";

export const PROVIDER_CONNECTION_DISCONNECT_CONFIRM_TITLE =
  "Disconnect this provider from ApplyFlow?";

export const PROVIDER_CONNECTION_DISCONNECT_CONFIRM_BODY =
  "This removes the Nango connection used by ApplyFlow. It does not necessarily revoke the app directly in your Google Account.";

export const PROVIDER_CONNECTION_DISCONNECT_CANCEL_LABEL = "Cancel";
export const PROVIDER_CONNECTION_DISCONNECT_CONFIRM_LABEL = "Disconnect";

export const PROVIDER_CONNECTION_DISCONNECT_GOOGLE_HINT =
  "To revoke the OAuth grant itself, remove the app under Google Account → Security → Third-party connections.";

export const PROVIDER_CONNECTION_DISCONNECT_LABELS = {
  gmail: "Disconnect Gmail",
  calendar: "Disconnect Calendar",
} as const;

export const PROVIDER_CONNECTION_DISCONNECT_SUCCESS_LABELS = {
  gmail: "Gmail disconnected",
  calendar: "Calendar disconnected",
} as const;
