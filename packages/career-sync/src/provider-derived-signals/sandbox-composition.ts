import type { CalendarReadOnlyAdapter, CalendarReadOnlyAdapterRequest } from "../calendar-readonly-adapter/types.js";
import type { GmailReadOnlyAdapter, GmailReadOnlyAdapterRequest } from "../gmail-readonly-adapter/types.js";
import { composeProviderDerivedSignals } from "./composition.js";
import { createEmptyProviderDerivedSignalSummary, summarizeProviderDerivedSignals } from "./summary.js";
import type { ProviderDerivedSandboxCompositionResult } from "./types.js";

const COMPLETED_MESSAGE =
  "Sandbox provider-derived signals were composed safely from fake Gmail and Calendar metadata.";

const ERROR_MESSAGE = "Sandbox provider-derived signal composition failed safely.";

function createSandboxCompositionSafetyFlags(): Pick<
  ProviderDerivedSandboxCompositionResult,
  | "runtime"
  | "safeForClient"
  | "deterministic"
  | "importedRawProviderData"
  | "retainedRawPayload"
  | "retainedBodies"
  | "retainedSnippets"
  | "retainedDescriptions"
  | "retainedLocations"
  | "retainedMeetingLinks"
  | "retainedProviderIdentifiers"
  | "hasToken"
  | "userReviewRequired"
> {
  return {
    runtime: "sandbox",
    safeForClient: true,
    deterministic: true,
    importedRawProviderData: false,
    retainedRawPayload: false,
    retainedBodies: false,
    retainedSnippets: false,
    retainedDescriptions: false,
    retainedLocations: false,
    retainedMeetingLinks: false,
    retainedProviderIdentifiers: false,
    hasToken: false,
    userReviewRequired: true,
  };
}

export function createProviderDerivedSandboxCompositionResult(input: {
  gmailSignals: Parameters<typeof composeProviderDerivedSignals>[0]["gmailSignals"];
  calendarSignals: Parameters<typeof composeProviderDerivedSignals>[0]["calendarSignals"];
}): ProviderDerivedSandboxCompositionResult {
  const signals = composeProviderDerivedSignals(input);

  return {
    ...createSandboxCompositionSafetyFlags(),
    status: "completed",
    signals,
    summary: summarizeProviderDerivedSignals(signals),
    warnings: [],
    messages: [COMPLETED_MESSAGE],
  };
}

export function createFailedProviderDerivedSandboxCompositionResult(): ProviderDerivedSandboxCompositionResult {
  return {
    ...createSandboxCompositionSafetyFlags(),
    status: "error",
    signals: [],
    summary: createEmptyProviderDerivedSignalSummary(),
    warnings: ["sandbox_provider_derived_signal_composition_failed"],
    messages: [ERROR_MESSAGE],
  };
}

export async function executeProviderDerivedSandboxComposition(input: {
  gmailAdapter: GmailReadOnlyAdapter;
  gmailRequest: GmailReadOnlyAdapterRequest;
  calendarAdapter: CalendarReadOnlyAdapter;
  calendarRequest: CalendarReadOnlyAdapterRequest;
}): Promise<ProviderDerivedSandboxCompositionResult> {
  try {
    const [gmailResult, calendarResult] = await Promise.all([
      input.gmailAdapter.execute(input.gmailRequest),
      input.calendarAdapter.execute(input.calendarRequest),
    ]);

    if (gmailResult.status !== "completed" || calendarResult.status !== "completed") {
      return createFailedProviderDerivedSandboxCompositionResult();
    }

    return createProviderDerivedSandboxCompositionResult({
      gmailSignals: gmailResult.signals,
      calendarSignals: calendarResult.signals,
    });
  } catch {
    return createFailedProviderDerivedSandboxCompositionResult();
  }
}
