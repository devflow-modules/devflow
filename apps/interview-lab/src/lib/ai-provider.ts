import type { AiAnswerReviewRequest, AiAnswerReviewResult } from "./ai-answer-review";
import {
  buildReviewSystemPrompt,
  buildReviewUserPrompt,
  parseReviewJsonResponse,
  runMockAnswerReview,
} from "./ai-answer-review";
import { postOpenAiChatJsonCompletion } from "./openai-chat-json";

export type AiAnswerReviewProviderId = "mock" | "openai";

export interface AiAnswerReviewProvider {
  readonly id: AiAnswerReviewProviderId;
  review(request: AiAnswerReviewRequest): Promise<AiAnswerReviewResult>;
}

export function createMockAiAnswerReviewProvider(): AiAnswerReviewProvider {
  return {
    id: "mock",
    async review(request) {
      return runMockAnswerReview(request);
    },
  };
}

export function createOpenAiAnswerReviewProvider(apiKey: string): AiAnswerReviewProvider {
  const key = apiKey.trim();
  if (!key) {
    throw new Error("OpenAI API key is empty");
  }
  return {
    id: "openai",
    async review(request) {
      const content = await postOpenAiChatJsonCompletion({
        apiKey: key,
        model: "gpt-4o-mini",
        temperature: 0.3,
        messages: [
          { role: "system", content: buildReviewSystemPrompt() },
          { role: "user", content: buildReviewUserPrompt(request) },
        ],
      });

      const parsed = parseReviewJsonResponse(content);
      if (!parsed.ok) {
        throw new Error(parsed.error);
      }
      return parsed.data;
    },
  };
}

export function resolveAnswerReviewProvider(opts: {
  preferOpenAi: boolean;
  openAiApiKey: string | null | undefined;
}): AiAnswerReviewProvider {
  const key = opts.openAiApiKey?.trim();
  if (opts.preferOpenAi && key) {
    return createOpenAiAnswerReviewProvider(key);
  }
  return createMockAiAnswerReviewProvider();
}
