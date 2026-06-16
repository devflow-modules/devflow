import { evaluateProviderRuntimeFlags } from "../provider-runtime-flags/flags.js";
import type { ProviderRuntimeFlagName } from "../provider-runtime-flags/types.js";

/**
 * Local configuration preflight for Career Suite provider runtime.
 * No network calls, no secret values in output.
 */

export const CAREER_PROVIDER_RUNTIME_ENV_NAMES = [
  "CAREER_PROVIDER_RUNTIME_ENABLED",
  "NANGO_RUNTIME_ENABLED",
  "GMAIL_PROVIDER_ENABLED",
  "CALENDAR_PROVIDER_ENABLED",
  "NANGO_SECRET_KEY",
] as const;

export type CareerProviderRuntimeEnvName = (typeof CAREER_PROVIDER_RUNTIME_ENV_NAMES)[number];

export const NANGO_INTEGRATION_CONFIG_KEYS = {
  gmail: "google-mail",
  calendar: "google-calendar",
} as const;

export const PROVIDER_RUNTIME_SCOPES = {
  gmail: ["gmail.metadata.read"] as const,
  calendar: ["calendar.events.read"] as const,
};

const PLACEHOLDER_PATTERNS = [
  /^replace_me$/i,
  /^changeme$/i,
  /^your[-_]?secret/i,
  /^xxx+$/i,
  /^test[-_]?provider[-_]?config$/i,
  /^<[^>]+>$/,
];

export type CareerProviderRuntimePreflightEnv = Partial<
  Record<CareerProviderRuntimeEnvName, string | undefined>
>;

export type PreflightEnvPresence = "missing" | "configured" | "placeholder";

export type CareerProviderRuntimePreflightReport = {
  status: "ready" | "blocked";
  flags: ReturnType<typeof evaluateProviderRuntimeFlags>;
  envPresence: Record<CareerProviderRuntimeEnvName, PreflightEnvPresence>;
  issues: string[];
  gmailRuntime: "disabled" | "blocked" | "configured";
  calendarRuntime: "disabled" | "blocked" | "configured";
  nangoSecret: PreflightEnvPresence;
};

export function classifyProviderRuntimeEnvValue(
  value: string | undefined,
): PreflightEnvPresence {
  if (!value?.trim()) {
    return "missing";
  }

  if (PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(value.trim()))) {
    return "placeholder";
  }

  return "configured";
}

function flagEnvPresence(
  env: CareerProviderRuntimePreflightEnv,
  name: ProviderRuntimeFlagName,
): PreflightEnvPresence {
  return classifyProviderRuntimeEnvValue(env[name]);
}

function collectFlagHierarchyIssues(
  flags: ReturnType<typeof evaluateProviderRuntimeFlags>,
): string[] {
  const issues: string[] = [];

  if (flags.nangoRuntimeEnabled && !flags.careerProviderRuntimeEnabled) {
    issues.push("NANGO_RUNTIME_ENABLED without CAREER_PROVIDER_RUNTIME_ENABLED");
  }

  if (flags.gmailProviderEnabled && !flags.careerProviderRuntimeEnabled) {
    issues.push("GMAIL_PROVIDER_ENABLED without CAREER_PROVIDER_RUNTIME_ENABLED");
  }

  if (flags.calendarProviderEnabled && !flags.careerProviderRuntimeEnabled) {
    issues.push("CALENDAR_PROVIDER_ENABLED without CAREER_PROVIDER_RUNTIME_ENABLED");
  }

  if (flags.gmailProviderEnabled && !flags.nangoRuntimeEnabled) {
    issues.push("GMAIL_PROVIDER_ENABLED without NANGO_RUNTIME_ENABLED");
  }

  if (flags.calendarProviderEnabled && !flags.nangoRuntimeEnabled) {
    issues.push("CALENDAR_PROVIDER_ENABLED without NANGO_RUNTIME_ENABLED");
  }

  return issues;
}

export function evaluateCareerProviderRuntimePreflight(
  env: CareerProviderRuntimePreflightEnv = {},
): CareerProviderRuntimePreflightReport {
  const flags = evaluateProviderRuntimeFlags({
    CAREER_PROVIDER_RUNTIME_ENABLED: env.CAREER_PROVIDER_RUNTIME_ENABLED,
    NANGO_RUNTIME_ENABLED: env.NANGO_RUNTIME_ENABLED,
    GMAIL_PROVIDER_ENABLED: env.GMAIL_PROVIDER_ENABLED,
    CALENDAR_PROVIDER_ENABLED: env.CALENDAR_PROVIDER_ENABLED,
  });

  const nangoSecretPresence = classifyProviderRuntimeEnvValue(env.NANGO_SECRET_KEY);
  const issues = collectFlagHierarchyIssues(flags);

  if (flags.canUseGmailProvider && nangoSecretPresence !== "configured") {
    issues.push("Gmail runtime enabled but NANGO_SECRET_KEY is not configured");
  }

  if (flags.canUseCalendarProvider && nangoSecretPresence !== "configured") {
    issues.push("Calendar runtime enabled but NANGO_SECRET_KEY is not configured");
  }

  if (nangoSecretPresence === "placeholder") {
    issues.push("NANGO_SECRET_KEY uses a placeholder value");
  }

  const gmailRuntime = !flags.gmailProviderEnabled
    ? "disabled"
    : flags.canUseGmailProvider && nangoSecretPresence === "configured"
      ? "configured"
      : "blocked";

  const calendarRuntime = !flags.calendarProviderEnabled
    ? "disabled"
    : flags.canUseCalendarProvider && nangoSecretPresence === "configured"
      ? "configured"
      : "blocked";

  const runtimeRequested =
    flags.canUseGmailProvider || flags.canUseCalendarProvider || flags.canUseNangoRuntime;

  const status =
    issues.length > 0 || (runtimeRequested && nangoSecretPresence !== "configured")
      ? "blocked"
      : "ready";

  return {
    status,
    flags,
    envPresence: {
      CAREER_PROVIDER_RUNTIME_ENABLED: flagEnvPresence(env, "CAREER_PROVIDER_RUNTIME_ENABLED"),
      NANGO_RUNTIME_ENABLED: flagEnvPresence(env, "NANGO_RUNTIME_ENABLED"),
      GMAIL_PROVIDER_ENABLED: flagEnvPresence(env, "GMAIL_PROVIDER_ENABLED"),
      CALENDAR_PROVIDER_ENABLED: flagEnvPresence(env, "CALENDAR_PROVIDER_ENABLED"),
      NANGO_SECRET_KEY: nangoSecretPresence,
    },
    issues,
    gmailRuntime,
    calendarRuntime,
    nangoSecret: nangoSecretPresence,
  };
}

export function formatCareerProviderRuntimePreflightLines(
  report: CareerProviderRuntimePreflightReport,
): string[] {
  const lines = [
    `CAREER_PROVIDER_RUNTIME_ENABLED: ${report.envPresence.CAREER_PROVIDER_RUNTIME_ENABLED}`,
    `NANGO_RUNTIME_ENABLED: ${report.envPresence.NANGO_RUNTIME_ENABLED}`,
    `GMAIL_PROVIDER_ENABLED: ${report.envPresence.GMAIL_PROVIDER_ENABLED}`,
    `CALENDAR_PROVIDER_ENABLED: ${report.envPresence.CALENDAR_PROVIDER_ENABLED}`,
    `NANGO_SECRET_KEY: ${report.nangoSecret}`,
    `Gmail runtime: ${report.gmailRuntime}`,
    `Calendar runtime: ${report.calendarRuntime}`,
    `Preflight: ${report.status}`,
  ];

  for (const issue of report.issues) {
    lines.push(`Issue: ${issue}`);
  }

  return lines;
}

export function assertPreflightOutputIsSafe(
  output: string,
  env: CareerProviderRuntimePreflightEnv,
): void {
  const secret = env.NANGO_SECRET_KEY?.trim();

  if (secret && secret.length > 3 && output.includes(secret)) {
    throw new Error("Preflight output leaked secret value");
  }
}

export function isProviderRuntimeDefaultOff(
  env: CareerProviderRuntimePreflightEnv = {},
): boolean {
  const flags = evaluateProviderRuntimeFlags({
    CAREER_PROVIDER_RUNTIME_ENABLED: env.CAREER_PROVIDER_RUNTIME_ENABLED,
    NANGO_RUNTIME_ENABLED: env.NANGO_RUNTIME_ENABLED,
    GMAIL_PROVIDER_ENABLED: env.GMAIL_PROVIDER_ENABLED,
    CALENDAR_PROVIDER_ENABLED: env.CALENDAR_PROVIDER_ENABLED,
  });

  return (
    !flags.careerProviderRuntimeEnabled &&
    !flags.nangoRuntimeEnabled &&
    !flags.gmailProviderEnabled &&
    !flags.calendarProviderEnabled
  );
}
