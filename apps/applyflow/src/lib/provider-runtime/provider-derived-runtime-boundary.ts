// Server-only provider-derived runtime boundary.
// Do not import this file from client components.

import type { CalendarReadOnlyAdapterResult, GmailReadOnlyAdapterResult } from "@devflow/career-sync";
import {
  executeProviderDerivedRuntimeComposition,
  type ProviderDerivedRuntimeCompositionResult,
} from "./provider-derived-runtime-composition.js";

export async function executeApplyFlowProviderDerivedRuntimeBoundary(input: {
  executeGmail: () => Promise<GmailReadOnlyAdapterResult>;
  executeCalendar: () => Promise<CalendarReadOnlyAdapterResult>;
}): Promise<ProviderDerivedRuntimeCompositionResult> {
  return executeProviderDerivedRuntimeComposition({
    executeGmail: input.executeGmail,
    executeCalendar: input.executeCalendar,
  });
}
