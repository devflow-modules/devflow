import type { GmailDerivedSignal, GmailEphemeralMessageMetadata } from "@devflow/career-sync";

/**
 * Conservative runtime classifier for real Gmail metadata.
 * Unlike the sandbox classifier, this does not use career.* labels or infer signals from domains alone.
 *
 * The first runtime release returns no derived signals unless future PRs add
 * documented, metadata-only rules with unequivocal evidence.
 */
export function deriveGmailRuntimeSignalsFromMetadata(
  _metadata: GmailEphemeralMessageMetadata[],
): GmailDerivedSignal[] {
  return [];
}
