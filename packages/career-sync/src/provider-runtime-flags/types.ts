/**
 * Provider runtime feature flag types.
 * Evaluation helpers only — no OAuth, Nango runtime, provider calls, or persistence.
 */

export type ProviderRuntimeFlagName =
  | "CAREER_PROVIDER_RUNTIME_ENABLED"
  | "NANGO_RUNTIME_ENABLED"
  | "GMAIL_PROVIDER_ENABLED"
  | "CALENDAR_PROVIDER_ENABLED";

export type ProviderRuntimeFlagMap = Partial<
  Record<ProviderRuntimeFlagName, string | boolean | undefined | null>
>;

export type ProviderRuntimeFlagEvaluation = {
  careerProviderRuntimeEnabled: boolean;
  nangoRuntimeEnabled: boolean;
  gmailProviderEnabled: boolean;
  calendarProviderEnabled: boolean;
  canUseNangoRuntime: boolean;
  canUseGmailProvider: boolean;
  canUseCalendarProvider: boolean;
};
