import type { CareerChatResponse, LibreChatCareerChatBody } from "@devflow/career-core";

export const CAREER_CHAT_LIBRECHAT_URL = "/career-chat/librechat";

export type CareerChatWorkspaceUiState =
  | "idle"
  | "validating"
  | "blocked"
  | "completed"
  | "error";

export async function runCareerChatLibrechat(
  body: LibreChatCareerChatBody,
  fetchImpl: typeof fetch = fetch,
): Promise<CareerChatResponse> {
  const response = await fetchImpl(CAREER_CHAT_LIBRECHAT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  return (await response.json()) as CareerChatResponse;
}

export const CAREER_FEEDBACK_URL = "/career-feedback";

export type CareerFeedbackRating = "helpful" | "partially_helpful" | "not_helpful";
export type CareerFeedbackCategory =
  | "resume"
  | "ats"
  | "interview"
  | "career_strategy"
  | "application_fit"
  | "system";

/**
 * Submits explicit pilot feedback. `consentToStore` defaults to false (the default repository
 * discards the payload). No resume, job description, or provider payload is ever sent.
 */
export async function submitCareerFeedback(
  input: {
    rating: CareerFeedbackRating;
    category: CareerFeedbackCategory;
    correlationId?: string;
    consentToStore?: boolean;
  },
  fetchImpl: typeof fetch = fetch,
): Promise<{ ok: boolean }> {
  try {
    const response = await fetchImpl(CAREER_FEEDBACK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rating: input.rating,
        category: input.category,
        correlationId: input.correlationId,
        consentToStore: input.consentToStore ?? false,
      }),
    });
    return { ok: response.ok };
  } catch {
    return { ok: false };
  }
}

export function careerFeedbackCategoryForIntent(action: string): CareerFeedbackCategory {
  switch (action) {
    case "analyze_resume":
      return "resume";
    case "analyze_ats_compatibility":
      return "ats";
    case "prepare_interview":
      return "interview";
    case "plan_career_strategy":
      return "career_strategy";
    case "analyze_application_fit":
      return "application_fit";
    default:
      return "system";
  }
}
