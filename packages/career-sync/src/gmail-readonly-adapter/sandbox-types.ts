import type { GmailEphemeralMessageMetadata } from "./types.js";

/**
 * Sandbox/demo fixture — fake metadata only, never real inbox content.
 */
export type GmailSandboxFixture = {
  fixtureId: string;
  metadata: GmailEphemeralMessageMetadata[];
};

export type GmailSandboxFixtureId =
  | "gmail-application-detected"
  | "gmail-interview-likely"
  | "gmail-follow-up-required"
  | "gmail-recruiter-response"
  | "gmail-rejection-likely"
  | "gmail-offer-likely"
  | "gmail-no-career-signal";
