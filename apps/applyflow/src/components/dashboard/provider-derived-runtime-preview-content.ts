export const PROVIDER_DERIVED_RUNTIME_PREVIEW_DEFAULT_MESSAGES = 10;
export const PROVIDER_DERIVED_RUNTIME_PREVIEW_DEFAULT_EVENTS = 10;

export const PROVIDER_DERIVED_RUNTIME_PREVIEW_TITLE = "Provider-derived runtime preview";
export const PROVIDER_DERIVED_RUNTIME_PREVIEW_BADGE = "Read-only";
export const PROVIDER_DERIVED_RUNTIME_PREVIEW_EPHEMERAL = "Ephemeral";
export const PROVIDER_DERIVED_RUNTIME_PREVIEW_REVIEW_REQUIRED = "User review required";
export const PROVIDER_DERIVED_RUNTIME_PREVIEW_NO_RAW_DATA = "No raw provider data retained";
export const PROVIDER_DERIVED_RUNTIME_PREVIEW_NO_CAREER_BUNDLE = "No CareerBundle changes";
export const PROVIDER_DERIVED_RUNTIME_PREVIEW_BUTTON_LABEL = "Run read-only preview";

export const PROVIDER_DERIVED_RUNTIME_PREVIEW_UI_MESSAGES = {
  completed:
    "Read-only provider preview completed. No raw Gmail or Calendar data was retained.",
  partial:
    "Read-only provider preview completed partially. Available signals require manual review.",
  blocked:
    "Provider preview is blocked until verified Gmail and Calendar connections are available.",
  error: "Provider preview failed safely. No provider data was stored.",
  idle: "Preview runs only after explicit consent and verified Gmail and Calendar connections.",
} as const;
