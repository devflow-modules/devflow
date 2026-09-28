import type { AiTextTask, CandidateProfile } from "@devflow/applyflow-core";

import { getRuntime, hasValidExtensionContext } from "./extension-runtime.js";
import {
  GENERATE_AI_MESSAGE,
  type GenerateAiRequest,
  type GenerateAiResponse,
} from "./ai-messages.js";

const GENERATE_TIMEOUT_MS = 70_000;

export type RequestGenerateAiArgs = {
  task: AiTextTask;
  language: "pt" | "en";
  profile: CandidateProfile;
  jobTitle?: string;
  companyName?: string;
  jobTextSlice?: string;
  questionLabel?: string;
  visibleQuestionText?: string;
};

/**
 * Content-script client: request AI capability from the service worker.
 * Never includes apiKey.
 */
export function requestGenerateAi(args: RequestGenerateAiArgs): Promise<GenerateAiResponse> {
  const rt = getRuntime();
  if (!rt?.sendMessage || !hasValidExtensionContext()) {
    return Promise.resolve({
      ok: false,
      error: "internal_error",
      reason: "Extension context unavailable",
    });
  }

  const message: GenerateAiRequest = {
    type: GENERATE_AI_MESSAGE,
    task: args.task,
    language: args.language,
    profile: args.profile,
    jobTitle: args.jobTitle,
    companyName: args.companyName,
    jobTextSlice: args.jobTextSlice,
    questionLabel: args.questionLabel,
    visibleQuestionText: args.visibleQuestionText,
  };

  return new Promise((resolve) => {
    let settled = false;
    const finish = (value: GenerateAiResponse) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    };

    const timer = setTimeout(
      () => finish({ ok: false, error: "provider_error", reason: "Pedido expirou (timeout)." }),
      GENERATE_TIMEOUT_MS,
    );

    try {
      rt.sendMessage(message, (response: GenerateAiResponse | undefined) => {
        const lastError = chrome.runtime?.lastError;
        if (lastError && response === undefined) {
          finish({
            ok: false,
            error: "internal_error",
            reason: lastError.message || "runtime_error",
          });
          return;
        }
        if (!response || typeof response !== "object" || !("ok" in response)) {
          finish({ ok: false, error: "internal_error", reason: "empty_response" });
          return;
        }
        finish(response);
      });
    } catch (e) {
      finish({
        ok: false,
        error: "internal_error",
        reason: e instanceof Error ? e.message : "send_failed",
      });
    }
  });
}
