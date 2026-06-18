import { z } from "zod";
import { resolveCareerCorrelationId } from "./correlation";

/**
 * Explicit, consent-gated pilot feedback.
 *
 * The payload is deliberately minimal: a rating, a category, an optional bounded comment, an
 * optional correlation id, and an explicit `consentToStore`. There is NO resume, NO full job
 * description, NO provider payload, NO required email, NO fingerprint, and NO hidden analytics.
 * Feedback is only stored when `consentToStore` is true; otherwise it is validated and
 * discarded.
 */
export const CAREER_FEEDBACK_COMMENT_MAX_LENGTH = 1000;

export const CAREER_FEEDBACK_RATINGS = ["helpful", "partially_helpful", "not_helpful"] as const;
export const CAREER_FEEDBACK_CATEGORIES = [
  "resume",
  "ats",
  "interview",
  "career_strategy",
  "application_fit",
  "system",
] as const;

export const careerFeedbackSchema = z
  .object({
    rating: z.enum(CAREER_FEEDBACK_RATINGS),
    category: z.enum(CAREER_FEEDBACK_CATEGORIES),
    comment: z.string().max(CAREER_FEEDBACK_COMMENT_MAX_LENGTH).optional(),
    correlationId: z.string().optional(),
    consentToStore: z.boolean(),
  })
  .strict();

export type CareerFeedback = z.infer<typeof careerFeedbackSchema>;

export type CareerFeedbackRecord = {
  rating: CareerFeedback["rating"];
  category: CareerFeedback["category"];
  comment?: string;
  correlationId: string;
  receivedAt: string;
};

/**
 * Storage adapter. The default provider is `discard`: it accepts the record, returns success,
 * and stores nothing. No new database infrastructure is introduced in this boundary.
 */
export type CareerFeedbackRepository = {
  provider: string;
  store: (record: CareerFeedbackRecord) => Promise<{ stored: boolean }>;
};

export function createDiscardFeedbackRepository(): CareerFeedbackRepository {
  return {
    provider: "discard",
    store: async () => ({ stored: false }),
  };
}

export const careerFeedbackRepository = createDiscardFeedbackRepository();

export type CareerFeedbackResult = {
  status: "accepted" | "discarded" | "rejected";
  stored: boolean;
  consentRespected: boolean;
  correlationId: string;
  reviewRequired: true;
  safeForClient: true;
  hasToken: false;
  persisted: boolean;
  toolExecutionOccurred: false;
  errorCode?: string;
};

export type CareerFeedbackParseResult =
  | { ok: true; value: CareerFeedback }
  | { ok: false; errorCode: "invalid_request" };

export function parseCareerFeedback(body: unknown): CareerFeedbackParseResult {
  const parsed = careerFeedbackSchema.safeParse(body);
  if (!parsed.success) {
    return { ok: false, errorCode: "invalid_request" };
  }
  return { ok: true, value: parsed.data };
}

/**
 * Handles a feedback submission. When `consentToStore` is false the payload is validated and
 * discarded (no storage). When true, it is handed to the repository (default `discard`, so
 * still nothing is persisted unless a real repository is wired in later).
 */
export async function handleCareerFeedback(
  body: unknown,
  repository: CareerFeedbackRepository = careerFeedbackRepository,
): Promise<CareerFeedbackResult> {
  const parsed = parseCareerFeedback(body);

  const base = {
    reviewRequired: true as const,
    safeForClient: true as const,
    hasToken: false as const,
    toolExecutionOccurred: false as const,
  };

  if (!parsed.ok) {
    return {
      ...base,
      status: "rejected",
      stored: false,
      consentRespected: true,
      correlationId: resolveCareerCorrelationId(),
      persisted: false,
      errorCode: parsed.errorCode,
    };
  }

  const correlationId = resolveCareerCorrelationId(parsed.value.correlationId);

  if (!parsed.value.consentToStore) {
    return {
      ...base,
      status: "discarded",
      stored: false,
      consentRespected: true,
      correlationId,
      persisted: false,
    };
  }

  const { stored } = await repository.store({
    rating: parsed.value.rating,
    category: parsed.value.category,
    comment: parsed.value.comment,
    correlationId,
    receivedAt: new Date().toISOString(),
  });

  return {
    ...base,
    status: "accepted",
    stored,
    consentRespected: true,
    correlationId,
    persisted: stored,
  };
}
