import {
  buildSignalId,
  companyHintFromDomain,
  extractEmailDomain,
  normalizeText,
} from "../shared/normalize.js";
import type { CareerSyncSignal, RawGmailMessageLike } from "../shared/types.js";
import { containsCareerKeyword, requiresAction, shouldRetainRawProviderData } from "../privacy/filters.js";
import { redactSensitiveText } from "../privacy/redact.js";
import {
  gmailMessageCorpus,
  inferGmailProcessStage,
  inferRoleHint,
} from "./normalize-gmail-signal.js";

export function normalizeGmailMessage(message: RawGmailMessageLike): CareerSyncSignal | null {
  const corpus = gmailMessageCorpus(message);
  if (!corpus) return null;

  if (!containsCareerKeyword(corpus) && inferGmailProcessStage(corpus).stage === "unknown") {
    return null;
  }

  const { stage, confidence } = inferGmailProcessStage(corpus);
  const actionRequired = requiresAction(corpus);
  const domain = extractEmailDomain(message.from);
  const companyHint = companyHintFromDomain(domain);

  const subject = normalizeText(message.subject) || "Career-related email";
  const safeSummary = redactSensitiveText(subject);

  return {
    id: buildSignalId("gmail", message.id),
    source: "gmail",
    providerId: message.id,
    companyHint,
    roleHint: inferRoleHint(message.subject),
    processStage: stage,
    actionRequired,
    receivedAt: message.receivedAt,
    confidence: actionRequired && confidence !== "high" ? "medium" : confidence,
    safeSummary,
    rawRetained: shouldRetainRawProviderData(),
  };
}

export function extractGmailSignals(messages: RawGmailMessageLike[]): CareerSyncSignal[] {
  const out: CareerSyncSignal[] = [];
  for (const message of messages) {
    const signal = normalizeGmailMessage(message);
    if (signal) out.push(signal);
  }
  return out;
}
