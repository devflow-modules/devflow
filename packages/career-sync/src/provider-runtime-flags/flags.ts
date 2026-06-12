import type {
  ProviderRuntimeFlagEvaluation,
  ProviderRuntimeFlagMap,
  ProviderRuntimeFlagName,
} from "./types.js";

/**
 * These helpers evaluate provider runtime gates only.
 * They do not implement OAuth, Nango runtime, provider calls, token storage, persistence, or sync jobs.
 */

export function readProviderRuntimeFlag(
  flags: ProviderRuntimeFlagMap,
  name: ProviderRuntimeFlagName,
): boolean {
  const value = flags[name];
  if (value === true) {
    return true;
  }
  if (value === "true") {
    return true;
  }
  return false;
}

export function evaluateProviderRuntimeFlags(
  flags: ProviderRuntimeFlagMap,
): ProviderRuntimeFlagEvaluation {
  const careerProviderRuntimeEnabled = readProviderRuntimeFlag(
    flags,
    "CAREER_PROVIDER_RUNTIME_ENABLED",
  );
  const nangoRuntimeEnabled = readProviderRuntimeFlag(flags, "NANGO_RUNTIME_ENABLED");
  const gmailProviderEnabled = readProviderRuntimeFlag(flags, "GMAIL_PROVIDER_ENABLED");
  const calendarProviderEnabled = readProviderRuntimeFlag(
    flags,
    "CALENDAR_PROVIDER_ENABLED",
  );

  const canUseNangoRuntime = careerProviderRuntimeEnabled && nangoRuntimeEnabled;
  const canUseGmailProvider =
    careerProviderRuntimeEnabled && nangoRuntimeEnabled && gmailProviderEnabled;
  const canUseCalendarProvider =
    careerProviderRuntimeEnabled && nangoRuntimeEnabled && calendarProviderEnabled;

  return {
    careerProviderRuntimeEnabled,
    nangoRuntimeEnabled,
    gmailProviderEnabled,
    calendarProviderEnabled,
    canUseNangoRuntime,
    canUseGmailProvider,
    canUseCalendarProvider,
  };
}

export function canUseProviderRuntime(flags: ProviderRuntimeFlagMap): boolean {
  return readProviderRuntimeFlag(flags, "CAREER_PROVIDER_RUNTIME_ENABLED");
}

export function canUseNangoRuntime(flags: ProviderRuntimeFlagMap): boolean {
  return evaluateProviderRuntimeFlags(flags).canUseNangoRuntime;
}

export function canUseGmailProvider(flags: ProviderRuntimeFlagMap): boolean {
  return evaluateProviderRuntimeFlags(flags).canUseGmailProvider;
}

export function canUseCalendarProvider(flags: ProviderRuntimeFlagMap): boolean {
  return evaluateProviderRuntimeFlags(flags).canUseCalendarProvider;
}
