import type { InboundEmail } from "@devflow/applyflow-core";

export function inboundEmailsFromProviderPreview(
  signals: ReadonlyArray<{
    id: string;
    occurredAt: string;
    company?: string;
    kind: string;
    reason?: string;
  }>,
): InboundEmail[] {
  return signals
    .filter((signal) => signal.kind !== "provider_follow_up_window")
    .map((signal) => ({
      id: signal.id,
      receivedAt: signal.occurredAt,
      senderDomain: signal.company,
    }));
}
