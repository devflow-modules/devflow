import type { ProviderKind, ProviderRuntime } from "../provider-adapter/types.js";

/**
 * Fake/sandbox Nango-like payloads for adapter contract validation only.
 * No OAuth, Nango SDK, Gmail API, Calendar API, or provider calls.
 */

export type NangoSandboxProvider = Extract<ProviderKind, "gmail" | "calendar">;

export type NangoSandboxRuntime = Extract<ProviderRuntime, "sandbox">;

export type NangoSandboxGmailPayload = {
  provider: "gmail";
  /** Sandbox/adapter ID — not a raw provider message ID. */
  id: string;
  receivedAt?: string;
  subject?: string;
  safeSummary?: string;
  companyHint?: string;
  processStageHint?: string;
  actionRequired?: boolean;
};

export type NangoSandboxCalendarPayload = {
  provider: "calendar";
  /** Sandbox/adapter ID — not a raw provider event ID. */
  id: string;
  eventAt?: string;
  title?: string;
  safeSummary?: string;
  companyHint?: string;
  processStageHint?: string;
  actionRequired?: boolean;
};

export type NangoSandboxPayload = NangoSandboxGmailPayload | NangoSandboxCalendarPayload;
