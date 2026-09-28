import type { AiTextTask, CandidateProfile } from "@devflow/applyflow-core";

/**
 * AF-AI-001 — content script requests AI capability; never credentials.
 *
 * Content → service worker only. No apiKey / Authorization / Bearer / baseURL.
 */

export const GENERATE_AI_MESSAGE = "applyflow:generate-ai" as const;
export const TEST_AI_MESSAGE = "applyflow:test-ai" as const;
export const GET_PUBLIC_SETTINGS_MESSAGE = "applyflow:get-public-settings" as const;

export const AI_TEXT_TASKS = [
  "cover_letter",
  "open_answer",
  "recruiter_message",
  "fit_summary",
  "gap_explanation",
] as const satisfies readonly AiTextTask[];

const MAX_JOB_TEXT = 12_000;
const MAX_QUESTION = 4_000;
const MAX_TITLE = 500;
const MAX_DRAFT_KEY = 512;

export type GenerateAiRequest = {
  type: typeof GENERATE_AI_MESSAGE;
  task: AiTextTask;
  language: "pt" | "en";
  profile: CandidateProfile;
  jobTitle?: string;
  companyName?: string;
  jobTextSlice?: string;
  questionLabel?: string;
  visibleQuestionText?: string;
};

export type GenerateAiSuccess = { ok: true; text: string };
export type GenerateAiFailure = {
  ok: false;
  error:
    | "invalid_message"
    | "unauthorized_sender"
    | "ai_disabled"
    | "ai_key_missing"
    | "no_profile"
    | "provider_error"
    | "internal_error";
  reason?: string;
};
export type GenerateAiResponse = GenerateAiSuccess | GenerateAiFailure;

/** Options-only: test provider without exposing stored key to content. */
export type TestAiRequest = {
  type: typeof TEST_AI_MESSAGE;
  /** Draft key from options input; if omitted, SW uses stored private key. */
  draftApiKey?: string;
  model?: string;
};

export type TestAiResponse =
  | { ok: true; text: string }
  | { ok: false; error: "invalid_message" | "unauthorized_sender" | "ai_key_missing" | "provider_error"; reason?: string };

export type GetPublicSettingsRequest = { type: typeof GET_PUBLIC_SETTINGS_MESSAGE };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asFiniteString(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, max);
}

function isAiTextTask(value: unknown): value is AiTextTask {
  return typeof value === "string" && (AI_TEXT_TASKS as readonly string[]).includes(value);
}

/**
 * Strict parse — rejects unknown top-level keys that look like credential/network smuggling.
 */
const FORBIDDEN_GENERATE_KEYS = new Set([
  "apiKey",
  "api_key",
  "authorization",
  "Authorization",
  "bearer",
  "Bearer",
  "baseURL",
  "baseUrl",
  "url",
  "endpoint",
  "headers",
  "fetch",
  "providerRequest",
]);

export function parseGenerateAiRequest(raw: unknown): GenerateAiRequest | null {
  if (!isPlainObject(raw)) return null;
  if (raw.type !== GENERATE_AI_MESSAGE) return null;

  for (const key of Object.keys(raw)) {
    if (FORBIDDEN_GENERATE_KEYS.has(key)) return null;
  }

  if (!isAiTextTask(raw.task)) return null;
  if (raw.language !== "pt" && raw.language !== "en") return null;
  if (!isPlainObject(raw.profile)) return null;

  return {
    type: GENERATE_AI_MESSAGE,
    task: raw.task,
    language: raw.language,
    profile: raw.profile as CandidateProfile,
    jobTitle: asFiniteString(raw.jobTitle, MAX_TITLE),
    companyName: asFiniteString(raw.companyName, MAX_TITLE),
    jobTextSlice: asFiniteString(raw.jobTextSlice, MAX_JOB_TEXT),
    questionLabel: asFiniteString(raw.questionLabel, MAX_QUESTION),
    visibleQuestionText: asFiniteString(raw.visibleQuestionText, MAX_QUESTION),
  };
}

export function parseTestAiRequest(raw: unknown): TestAiRequest | null {
  if (!isPlainObject(raw)) return null;
  if (raw.type !== TEST_AI_MESSAGE) return null;
  for (const key of Object.keys(raw)) {
    if (FORBIDDEN_GENERATE_KEYS.has(key) && key !== "draftApiKey") return null;
  }
  // draftApiKey allowed only on TEST_AI (options → SW), never GENERATE_AI
  let draftApiKey: string | undefined;
  if (raw.draftApiKey !== undefined) {
    if (typeof raw.draftApiKey !== "string") return null;
    draftApiKey = raw.draftApiKey.trim().slice(0, MAX_DRAFT_KEY) || undefined;
  }
  return {
    type: TEST_AI_MESSAGE,
    draftApiKey,
    model: asFiniteString(raw.model, 120),
  };
}

export function parseGetPublicSettingsRequest(raw: unknown): GetPublicSettingsRequest | null {
  if (!isPlainObject(raw)) return null;
  if (raw.type !== GET_PUBLIC_SETTINGS_MESSAGE) return null;
  for (const key of Object.keys(raw)) {
    if (FORBIDDEN_GENERATE_KEYS.has(key)) return null;
  }
  return { type: GET_PUBLIC_SETTINGS_MESSAGE };
}

/**
 * MV3 sender validation.
 *
 * Meaningful checks:
 * - `sender.id` must equal this extension's id (Chrome sets this; not attacker-controlled body).
 * - Content scripts typically have `sender.tab`; options/extension pages have extension URL.
 * - Never trust fields inside the message body for identity.
 *
 * Not a guarantee against other extensions: only same-extension runtime messaging.
 */
export function isTrustedExtensionSender(sender: chrome.runtime.MessageSender | undefined): boolean {
  const rt = typeof chrome !== "undefined" ? chrome.runtime : undefined;
  if (!rt?.id || !sender) return false;
  if (sender.id !== rt.id) return false;
  return true;
}

/** Options / extension pages may send TEST_AI with draft key. */
export function isExtensionPageSender(sender: chrome.runtime.MessageSender | undefined): boolean {
  if (!isTrustedExtensionSender(sender)) return false;
  const url = sender?.url ?? "";
  return url.startsWith("chrome-extension://") || url.startsWith("moz-extension://");
}
