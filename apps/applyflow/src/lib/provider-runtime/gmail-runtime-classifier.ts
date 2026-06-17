import {
  createProviderDerivedSignalId,
  type GmailDerivedSignal,
  type GmailEphemeralMessageMetadata,
} from "@devflow/career-sync";
import { runtimeSignalConfidence } from "./provider-runtime-signal-confidence";

const ALLOWED_GMAIL_LABELS = new Set([
  "INBOX",
  "SENT",
  "UNREAD",
  "IMPORTANT",
  "STARRED",
  "DRAFT",
  "SPAM",
  "TRASH",
  "CATEGORY_PERSONAL",
  "CATEGORY_SOCIAL",
  "CATEGORY_PROMOTIONS",
  "CATEGORY_UPDATES",
  "CATEGORY_FORUMS",
]);

const EMAIL_ACTIVITY_REASON =
  "Rule A: factual Gmail activity from sanitized metadata (occurredAt, direction, senderDomain, recipientDomains, hasAttachment, labels). Subject, snippet, body, and full addresses were not analyzed.";

function isValidMetadata(item: GmailEphemeralMessageMetadata): boolean {
  if (!item.occurredAt || !Number.isFinite(Date.parse(item.occurredAt))) {
    return false;
  }

  return true;
}

function filterAllowedLabels(labels: string[] | undefined): string[] | undefined {
  if (!labels || labels.length === 0) {
    return undefined;
  }

  const filtered = labels.filter((label) => ALLOWED_GMAIL_LABELS.has(label));
  return filtered.length > 0 ? filtered : undefined;
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

function buildEmailActivityReason(item: GmailEphemeralMessageMetadata): string {
  const labels = filterAllowedLabels(item.labels);
  const labelSuffix = labels ? ` Labels used: ${labels.join(", ")}.` : " No authorized labels present.";
  return `${EMAIL_ACTIVITY_REASON}${labelSuffix}`;
}

export function deriveGmailRuntimeSignalsFromMetadata(
  metadata: GmailEphemeralMessageMetadata[],
): GmailDerivedSignal[] {
  const sorted = [...metadata].filter(isValidMetadata).sort(compareMetadata);
  const signals: GmailDerivedSignal[] = [];

  for (let index = 0; index < sorted.length; index += 1) {
    const item = sorted[index];
    const id = createProviderDerivedSignalId({
      source: "gmail",
      kind: "provider_email_activity",
      occurredAt: item.occurredAt,
      sequence: index + 1,
    });

    if (!id) {
      continue;
    }

    signals.push({
      id,
      kind: "provider_email_activity",
      provider: "gmail",
      occurredAt: item.occurredAt,
      company: item.senderDomain,
      confidence: runtimeSignalConfidence("high"),
      confidenceLevel: "high",
      reason: buildEmailActivityReason(item),
      reviewRequired: true,
      sourceCount: 1,
    });
  }

  return signals;
}
