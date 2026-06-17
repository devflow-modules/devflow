import type { ProviderDerivedSignalConfidenceLevel } from "@devflow/career-sync";

export const RUNTIME_SIGNAL_CONFIDENCE: Readonly<
  Record<ProviderDerivedSignalConfidenceLevel, number>
> = {
  high: 0.9,
  medium: 0.6,
  low: 0.3,
};

export function runtimeSignalConfidence(
  level: ProviderDerivedSignalConfidenceLevel,
): number {
  return RUNTIME_SIGNAL_CONFIDENCE[level];
}
