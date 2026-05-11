import { buildAiPrompt, type AiTextTask, extractJobIntelligence } from "@devflow/applyflow-core";
import type { CandidateProfile } from "@devflow/applyflow-core";
import type { JobIntelligence } from "@devflow/applyflow-core";

import { applyFlowDebugLog } from "../content/applyflow-debug.js";
import { addAiAuditEntry } from "../storage/ai-audit-storage.js";
import type { ApplyFlowSettings } from "../storage/storage-types.js";
import { mergeAiSettings } from "../storage/applyflow-storage.js";
import { openAiChatCompletion } from "./openai-client.js";

export type GenerateAiTextParams = {
  settings: ApplyFlowSettings;
  profile: CandidateProfile;
  jobTitle?: string;
  companyName?: string;
  /** Se omitido, pode derivar de jobTextSlice via extractJobIntelligence */
  jobMeta?: JobIntelligence;
  jobTextSlice?: string;
  task: AiTextTask;
  questionLabel?: string;
  visibleQuestionText?: string;
  language: "pt" | "en";
};

function metaFromSlice(slice?: string, explicit?: JobIntelligence): JobIntelligence | undefined {
  if (explicit) return explicit;
  if (!slice?.trim()) return undefined;
  return extractJobIntelligence(slice.slice(0, 12_000));
}

export async function generateAiText(input: GenerateAiTextParams): Promise<{
  ok: boolean;
  text?: string;
  reason?: string;
}> {
  const ai = mergeAiSettings(input.settings.ai);

  if (!ai.enabled) {
    await addAiAuditEntry({ task: input.task, result: "failed", reason: "ia_disabled" });
    return { ok: false, reason: "IA desactivada nas opções." };
  }
  if (!ai.apiKey?.trim()) {
    await addAiAuditEntry({ task: input.task, result: "failed", reason: "no_api_key" });
    return { ok: false, reason: "Configure a API key OpenAI nas opções." };
  }

  const jobMeta = metaFromSlice(input.jobTextSlice, input.jobMeta);

  const { system, user } = buildAiPrompt({
    task: input.task,
    candidateProfile: input.profile,
    jobTitle: input.jobTitle,
    companyName: input.companyName,
    jobMeta,
    questionLabel: input.questionLabel,
    visibleQuestionText: input.visibleQuestionText,
    jobTextSlice: input.jobTextSlice,
    language: input.language,
  });

  applyFlowDebugLog("ai generate", {
    task: input.task,
    systemLen: system.length,
    userLen: user.length,
    model: ai.model,
  });

  const out = await openAiChatCompletion({
    apiKey: ai.apiKey.trim(),
    model: ai.model,
    system,
    user,
    maxTokens: Math.min(4096, Math.max(64, ai.maxTokens)),
    temperature: Math.min(2, Math.max(0, ai.temperature)),
  });

  if (!out.ok) {
    await addAiAuditEntry({
      task: input.task,
      result: "failed",
      reason: out.reason?.slice(0, 240),
    });
    return { ok: false, reason: out.reason };
  }

  await addAiAuditEntry({
    task: input.task,
    result: "success",
    generatedLength: out.text.length,
  });

  return { ok: true, text: out.text };
}
