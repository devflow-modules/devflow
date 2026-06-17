import { createProviderDerivedSignalId } from "../provider-derived-signals/signal-id.js";
import type { GmailDerivedSignal, GmailDerivedSignalKind, GmailEphemeralMessageMetadata } from "./types.js";

const LABEL_KIND_ORDER: readonly { label: string; kind: GmailDerivedSignalKind }[] = [
  { label: "career.application", kind: "application_detected" },
  { label: "career.interview", kind: "interview_likely" },
  { label: "career.follow_up", kind: "follow_up_required" },
  { label: "career.recruiter_response", kind: "recruiter_response_detected" },
  { label: "career.rejection", kind: "rejection_likely" },
  { label: "career.offer", kind: "offer_likely" },
] as const;

const CONFIDENCE_BY_KIND: Readonly<Record<GmailDerivedSignalKind, number>> = {
  application_detected: 0.85,
  interview_likely: 0.9,
  follow_up_required: 0.75,
  recruiter_response_detected: 0.8,
  rejection_likely: 0.85,
  offer_likely: 0.9,
  provider_email_activity: 0.9,
  provider_activity_cluster: 0.6,
  provider_follow_up_window: 0.3,
};

const COMPANY_LABEL_PREFIX = "company.";

function deriveCompanyFromLabels(labels: string[] | undefined): string | undefined {
  if (!labels) {
    return undefined;
  }

  for (const label of labels) {
    if (label.startsWith(COMPANY_LABEL_PREFIX)) {
      const slug = label.slice(COMPANY_LABEL_PREFIX.length);
      if (!slug) {
        return undefined;
      }
      return slug.charAt(0).toUpperCase() + slug.slice(1);
    }
  }

  return undefined;
}

function resolveKindFromLabels(labels: string[] | undefined): GmailDerivedSignalKind | null {
  if (!labels || labels.length === 0) {
    return null;
  }

  const labelSet = new Set(labels);

  for (const entry of LABEL_KIND_ORDER) {
    if (labelSet.has(entry.label)) {
      return entry.kind;
    }
  }

  return null;
}

function compareMetadata(
  left: GmailEphemeralMessageMetadata,
  right: GmailEphemeralMessageMetadata,
): number {
  const timeCompare = left.occurredAt.localeCompare(right.occurredAt);
  if (timeCompare !== 0) {
    return timeCompare;
  }

  const leftDomain = left.senderDomain ?? "";
  const rightDomain = right.senderDomain ?? "";
  return leftDomain.localeCompare(rightDomain);
}

export function deriveGmailSignalsFromEphemeralMetadata(
  metadata: GmailEphemeralMessageMetadata[],
): GmailDerivedSignal[] {
  const sorted = [...metadata].sort(compareMetadata);
  const signals: GmailDerivedSignal[] = [];

  for (let index = 0; index < sorted.length; index += 1) {
    const item = sorted[index];
    const kind = resolveKindFromLabels(item.labels);

    if (!kind) {
      continue;
    }

    const id = createProviderDerivedSignalId({
      source: "gmail",
      kind,
      occurredAt: item.occurredAt,
      sequence: index + 1,
    });

    if (!id) {
      continue;
    }

    signals.push({
      id,
      kind,
      provider: "gmail",
      occurredAt: item.occurredAt,
      company: deriveCompanyFromLabels(item.labels),
      confidence: CONFIDENCE_BY_KIND[kind],
      reviewRequired: true,
      sourceCount: item.threadMessageCount ?? 1,
    });
  }

  return signals.sort((left, right) => {
    const timeCompare = left.occurredAt.localeCompare(right.occurredAt);
    if (timeCompare !== 0) {
      return timeCompare;
    }

    return left.kind.localeCompare(right.kind);
  });
}
