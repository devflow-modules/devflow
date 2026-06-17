// Server-only provider-derived runtime boundary.
// Do not import this file from client components.

import type { CalendarReadOnlyAdapterResult, GmailReadOnlyAdapterResult } from "@devflow/career-sync";
import {
  executeProviderDerivedRuntimeComposition,
  type ProviderDerivedRuntimeCompositionDependencies,
  type ProviderDerivedRuntimeCompositionResult,
} from "./provider-derived-runtime-composition";

export async function executeApplyFlowProviderDerivedRuntimeBoundary(
  input: ProviderDerivedRuntimeCompositionDependencies,
): Promise<ProviderDerivedRuntimeCompositionResult> {
  return executeProviderDerivedRuntimeComposition(input);
}
