import type { GmailEphemeralMessageMetadata } from "./types.js";
import type { GmailSandboxFixture, GmailSandboxFixtureId } from "./sandbox-types.js";

const SANDBOX_BASE_TIME = "2026-06-10T09:00:00.000Z";

function sandboxMetadata(
  input: Omit<GmailEphemeralMessageMetadata, "recipientDomains"> & {
    recipientDomains?: string[];
  },
): GmailEphemeralMessageMetadata {
  return {
    ...input,
    recipientDomains: input.recipientDomains ?? ["candidate.example"],
  };
}

export const GMAIL_SANDBOX_FIXTURE_APPLICATION_DETECTED: GmailSandboxFixture = {
  fixtureId: "gmail-application-detected",
  metadata: [
    sandboxMetadata({
      occurredAt: "2026-06-10T09:15:00.000Z",
      direction: "inbound",
      senderDomain: "jobs.example",
      hasAttachment: false,
      threadMessageCount: 1,
      labels: ["career.application", "company.acme"],
    }),
  ],
};

export const GMAIL_SANDBOX_FIXTURE_INTERVIEW_LIKELY: GmailSandboxFixture = {
  fixtureId: "gmail-interview-likely",
  metadata: [
    sandboxMetadata({
      occurredAt: "2026-06-10T10:30:00.000Z",
      direction: "inbound",
      senderDomain: "acme.example",
      hasAttachment: false,
      threadMessageCount: 2,
      labels: ["career.interview", "company.acme"],
    }),
  ],
};

export const GMAIL_SANDBOX_FIXTURE_FOLLOW_UP_REQUIRED: GmailSandboxFixture = {
  fixtureId: "gmail-follow-up-required",
  metadata: [
    sandboxMetadata({
      occurredAt: "2026-06-10T11:00:00.000Z",
      direction: "outbound",
      senderDomain: "candidate.example",
      recipientDomains: ["beta.example"],
      hasAttachment: false,
      threadMessageCount: 3,
      labels: ["career.follow_up", "company.beta"],
    }),
  ],
};

export const GMAIL_SANDBOX_FIXTURE_RECRUITER_RESPONSE: GmailSandboxFixture = {
  fixtureId: "gmail-recruiter-response",
  metadata: [
    sandboxMetadata({
      occurredAt: "2026-06-10T12:45:00.000Z",
      direction: "inbound",
      senderDomain: "jobs.example",
      hasAttachment: true,
      threadMessageCount: 4,
      labels: ["career.recruiter_response", "company.beta"],
    }),
  ],
};

export const GMAIL_SANDBOX_FIXTURE_REJECTION_LIKELY: GmailSandboxFixture = {
  fixtureId: "gmail-rejection-likely",
  metadata: [
    sandboxMetadata({
      occurredAt: "2026-06-10T14:00:00.000Z",
      direction: "inbound",
      senderDomain: "acme.example",
      hasAttachment: false,
      threadMessageCount: 1,
      labels: ["career.rejection", "company.acme"],
    }),
  ],
};

export const GMAIL_SANDBOX_FIXTURE_OFFER_LIKELY: GmailSandboxFixture = {
  fixtureId: "gmail-offer-likely",
  metadata: [
    sandboxMetadata({
      occurredAt: "2026-06-10T16:30:00.000Z",
      direction: "inbound",
      senderDomain: "beta.example",
      hasAttachment: true,
      threadMessageCount: 2,
      labels: ["career.offer", "company.beta"],
    }),
  ],
};

export const GMAIL_SANDBOX_FIXTURE_NO_CAREER_SIGNAL: GmailSandboxFixture = {
  fixtureId: "gmail-no-career-signal",
  metadata: [
    sandboxMetadata({
      occurredAt: "2026-06-10T08:00:00.000Z",
      direction: "inbound",
      senderDomain: "newsletter.example",
      hasAttachment: false,
      labels: ["newsletter.general"],
    }),
  ],
};

export const GMAIL_SANDBOX_FIXTURE_MULTI_SIGNAL: GmailSandboxFixture = {
  fixtureId: "gmail-multi-signal",
  metadata: [
    sandboxMetadata({
      occurredAt: "2026-06-11T09:00:00.000Z",
      direction: "inbound",
      senderDomain: "jobs.example",
      labels: ["career.application", "company.acme"],
      hasAttachment: false,
    }),
    sandboxMetadata({
      occurredAt: "2026-06-11T10:00:00.000Z",
      direction: "inbound",
      senderDomain: "acme.example",
      labels: ["career.interview", "company.acme"],
      hasAttachment: false,
      threadMessageCount: 2,
    }),
  ],
};

const FIXTURE_BY_ID: Record<GmailSandboxFixtureId, GmailSandboxFixture> = {
  "gmail-application-detected": GMAIL_SANDBOX_FIXTURE_APPLICATION_DETECTED,
  "gmail-interview-likely": GMAIL_SANDBOX_FIXTURE_INTERVIEW_LIKELY,
  "gmail-follow-up-required": GMAIL_SANDBOX_FIXTURE_FOLLOW_UP_REQUIRED,
  "gmail-recruiter-response": GMAIL_SANDBOX_FIXTURE_RECRUITER_RESPONSE,
  "gmail-rejection-likely": GMAIL_SANDBOX_FIXTURE_REJECTION_LIKELY,
  "gmail-offer-likely": GMAIL_SANDBOX_FIXTURE_OFFER_LIKELY,
  "gmail-no-career-signal": GMAIL_SANDBOX_FIXTURE_NO_CAREER_SIGNAL,
};

export function getGmailSandboxFixture(fixtureId: GmailSandboxFixtureId): GmailSandboxFixture {
  return {
    fixtureId: FIXTURE_BY_ID[fixtureId].fixtureId,
    metadata: FIXTURE_BY_ID[fixtureId].metadata.map((item) => ({
      ...item,
      recipientDomains: [...item.recipientDomains],
      labels: item.labels ? [...item.labels] : undefined,
    })),
  };
}

export const GMAIL_SANDBOX_ALL_FIXTURES: GmailSandboxFixture[] = [
  GMAIL_SANDBOX_FIXTURE_APPLICATION_DETECTED,
  GMAIL_SANDBOX_FIXTURE_INTERVIEW_LIKELY,
  GMAIL_SANDBOX_FIXTURE_FOLLOW_UP_REQUIRED,
  GMAIL_SANDBOX_FIXTURE_RECRUITER_RESPONSE,
  GMAIL_SANDBOX_FIXTURE_REJECTION_LIKELY,
  GMAIL_SANDBOX_FIXTURE_OFFER_LIKELY,
  GMAIL_SANDBOX_FIXTURE_NO_CAREER_SIGNAL,
];

export { SANDBOX_BASE_TIME };
