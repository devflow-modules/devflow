/**
 * Privileged AI generation for the MV3 service worker.
 * Loads private settings itself — callers must not pass apiKey.
 */
import { generateAiText } from "../ai/generate-ai-text.js";
import { openAiPing } from "../ai/openai-client.js";
import { applyFlowDebugLog } from "../runtime/applyflow-debug.js";
import {
  getApplyFlowPrivateSettings,
  mergeAiSettings,
  toPublicSettings,
} from "../storage/applyflow-storage.js";
import type { GenerateAiRequest, GenerateAiResponse, TestAiRequest, TestAiResponse } from "../runtime/ai-messages.js";

export async function handleGenerateAiInServiceWorker(
  request: GenerateAiRequest,
): Promise<GenerateAiResponse> {
  const settings = await getApplyFlowPrivateSettings();
  const ai = mergeAiSettings(settings.ai);

  if (!ai.enabled) {
    return { ok: false, error: "ai_disabled", reason: "IA desactivada nas opções." };
  }
  if (!ai.apiKey?.trim()) {
    return { ok: false, error: "ai_key_missing", reason: "Configure a API key OpenAI nas opções." };
  }

  applyFlowDebugLog("sw generate_ai", {
    task: request.task,
    model: ai.model,
    hasKey: true,
  });

  const out = await generateAiText({
    settings,
    profile: request.profile,
    jobTitle: request.jobTitle,
    companyName: request.companyName,
    jobTextSlice: request.jobTextSlice,
    task: request.task,
    questionLabel: request.questionLabel,
    visibleQuestionText: request.visibleQuestionText,
    language: request.language,
  });

  if (!out.ok) {
    const reason = out.reason ?? "provider_error";
    if (/desactivada/i.test(reason)) return { ok: false, error: "ai_disabled", reason };
    if (/API key/i.test(reason)) return { ok: false, error: "ai_key_missing", reason };
    return { ok: false, error: "provider_error", reason };
  }

  return { ok: true, text: out.text ?? "" };
}

export async function handleTestAiInServiceWorker(request: TestAiRequest): Promise<TestAiResponse> {
  const settings = await getApplyFlowPrivateSettings();
  const ai = mergeAiSettings(settings.ai);
  const key = request.draftApiKey?.trim() || ai.apiKey?.trim();
  if (!key) {
    return { ok: false, error: "ai_key_missing", reason: "Introduza a API key para testar." };
  }
  const model = request.model?.trim() || ai.model;
  const r = await openAiPing({ apiKey: key, model });
  if (!r.ok) return { ok: false, error: "provider_error", reason: r.reason };
  return { ok: true, text: r.text };
}

export async function handleGetPublicSettingsInServiceWorker() {
  const priv = await getApplyFlowPrivateSettings();
  return toPublicSettings(priv, Boolean(priv.ai?.apiKey?.trim()));
}
