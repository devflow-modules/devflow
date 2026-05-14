import { z } from "zod";

/** Max characters for the answer body (after trim). Keeps quality high and payloads bounded. */
export const ANSWER_REVIEW_MAX_ANSWER_CHARS = 6000;

/** Max combined characters for optional context (role + company + interview type + language), each trimmed. */
export const ANSWER_REVIEW_MAX_CONTEXT_CHARS = 4000;

/** Input for review — only sent when the user explicitly requests a review. */
export type AiAnswerReviewRequest = {
  userAnswer: string;
  role?: string;
  company?: string;
  interviewType?: string;
  language?: string;
};

export const aiAnswerReviewResultSchema = z.object({
  score: z.number().min(0).max(10),
  strengths: z.array(z.string()).max(12),
  improvements: z.array(z.string()).max(12),
  improvedVersion: z.string(),
  englishNotes: z.string(),
  followUpPrompt: z.string(),
});

export type AiAnswerReviewResult = z.infer<typeof aiAnswerReviewResultSchema>;

export type AnswerReviewRunner = {
  review: (request: AiAnswerReviewRequest) => Promise<AiAnswerReviewResult>;
};

/** Combined length of optional context fields (trimmed), used against {@link ANSWER_REVIEW_MAX_CONTEXT_CHARS}. */
export function getAnswerReviewContextCharCount(req: Pick<AiAnswerReviewRequest, "role" | "company" | "interviewType" | "language">): number {
  const parts = [req.role, req.company, req.interviewType, req.language].map((s) => (s ?? "").trim());
  return parts.reduce((sum, p) => sum + p.length, 0);
}

export type ValidateAnswerReviewRequestResult =
  | { ok: true; trimmedAnswer: string }
  | { ok: false; error: string };

export function validateAnswerReviewRequest(req: AiAnswerReviewRequest): ValidateAnswerReviewRequestResult {
  const trimmedAnswer = req.userAnswer.trim();
  if (!trimmedAnswer) {
    return { ok: false, error: "Write an answer before reviewing." };
  }
  if (trimmedAnswer.length > ANSWER_REVIEW_MAX_ANSWER_CHARS) {
    return {
      ok: false,
      error: `Answer is too long (${trimmedAnswer.length} characters). Shorten to at most ${ANSWER_REVIEW_MAX_ANSWER_CHARS} characters, then try again.`,
    };
  }
  const contextChars = getAnswerReviewContextCharCount(req);
  if (contextChars > ANSWER_REVIEW_MAX_CONTEXT_CHARS) {
    return {
      ok: false,
      error: `Optional context is too long (${contextChars} characters combined). Reduce role, company, interview type, and language fields to at most ${ANSWER_REVIEW_MAX_CONTEXT_CHARS} characters total.`,
    };
  }
  return { ok: true, trimmedAnswer };
}

/**
 * Validates input, then calls the provider. Does not call {@link AnswerReviewRunner.review} when validation fails.
 */
export async function reviewAnswerWithLimits(
  req: AiAnswerReviewRequest,
  provider: AnswerReviewRunner,
): Promise<AiAnswerReviewResult> {
  const v = validateAnswerReviewRequest(req);
  if (!v.ok) {
    throw new Error(v.error);
  }
  return provider.review({ ...req, userAnswer: v.trimmedAnswer });
}

/** Input for Markdown export (study / offline review). */
export type AnswerReviewMarkdownInput = {
  request: AiAnswerReviewRequest;
  result: AiAnswerReviewResult;
  /** ISO timestamp; defaults to `new Date().toISOString()` when omitted. */
  exportedAt?: string;
};

function pickMarkdownFence(body: string): string {
  let fence = "```";
  while (body.includes(fence)) {
    fence += "`";
  }
  return fence;
}

function fencedTextBlock(body: string): string {
  const fence = pickMarkdownFence(body);
  return `${fence}\n${body}\n${fence}`;
}

function bulletList(items: string[]): string {
  return items.map((s) => `- ${s.replace(/\n/g, " ")}`).join("\n");
}

/**
 * Serialises an answer review into Markdown for notes, Git, or spaced repetition.
 * Verbatim fields use a fence whose length avoids collisions with ``` inside the text.
 */
export function formatAnswerReviewAsMarkdown(input: AnswerReviewMarkdownInput): string {
  const { request, result } = input;
  const exportedAt = input.exportedAt ?? new Date().toISOString();
  const answer = request.userAnswer.trim();

  const ctxLines: string[] = [];
  if (request.role?.trim()) ctxLines.push(`- **Role:** ${request.role.trim()}`);
  if (request.company?.trim()) ctxLines.push(`- **Company:** ${request.company.trim()}`);
  if (request.interviewType?.trim()) ctxLines.push(`- **Interview type:** ${request.interviewType.trim()}`);
  if (request.language?.trim()) ctxLines.push(`- **Language preference:** ${request.language.trim()}`);
  const contextBlock = ctxLines.length > 0 ? ctxLines.join("\n") : "_No optional context provided._";

  const lines: string[] = [
    "# AI Answer Review",
    "",
    `_Exported (ISO): ${exportedAt}_`,
    "",
    "> Preparation only — not for hidden use in live interviews.",
    "",
    "## Context",
    "",
    contextBlock,
    "",
    "## Original answer",
    "",
    fencedTextBlock(answer || "(empty)"),
    "",
    "## Score",
    "",
    `${result.score}/10`,
    "",
    "## Strengths",
    "",
    bulletList(result.strengths),
    "",
    "## Improvements",
    "",
    bulletList(result.improvements),
    "",
    "## Improved version",
    "",
    fencedTextBlock(result.improvedVersion),
    "",
    "## English notes",
    "",
    result.englishNotes,
    "",
    "## Follow-up practice prompt",
    "",
    result.followUpPrompt,
    "",
  ];

  return lines.join("\n").trimEnd() + "\n";
}

/** Removes characters unsafe in filenames across common desktop OSes. */
export function sanitizeAnswerReviewFilenameSlug(raw: string): string {
  const t = raw
    .replace(/[\u0000-\u001f<>:"/\\|?*]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[\s.-]+|[\s.-]+$/g, "");
  return t.slice(0, 60);
}

/**
 * Builds a `.md` download name: optional company and role (sanitised), plus ISO date.
 * Falls back to `answer-review-YYYY-MM-DD.md` when no usable slug parts remain.
 */
export function buildAnswerReviewExportFilename(meta: { role?: string; company?: string }, date: Date = new Date()): string {
  const company = sanitizeAnswerReviewFilenameSlug(meta.company?.trim() ?? "");
  const role = sanitizeAnswerReviewFilenameSlug(meta.role?.trim() ?? "");
  const parts = [company, role].filter((p) => p.length > 0);
  let base = parts.length > 0 ? parts.join("-") : "answer-review";
  const day = date.toISOString().slice(0, 10);
  let name = `${base}-${day}.md`;
  if (name.length > 120) {
    base = base.slice(0, Math.max(1, 120 - day.length - 5));
    name = `${base}-${day}.md`;
  }
  return name;
}

export const REVIEW_JSON_SCHEMA_HINT = `Return a single JSON object with keys:
score (number 0-10),
strengths (array of short strings),
improvements (array of short strings),
improvedVersion (string, rewritten answer),
englishNotes (string, concise language tips),
followUpPrompt (string, one practice question for the candidate).`;

export function buildReviewSystemPrompt(): string {
  return [
    "You are an interview coach helping candidates polish written answers for practice.",
    "Be constructive, specific, and concise.",
    "Do not encourage cheating in live interviews.",
    REVIEW_JSON_SCHEMA_HINT,
    "Respond with JSON only, no markdown fences.",
  ].join(" ");
}

export function buildReviewUserPrompt(req: AiAnswerReviewRequest): string {
  const lines: string[] = ["## Candidate answer (verbatim)", "", req.userAnswer.trim(), ""];
  if (req.company?.trim()) lines.push(`Company context: ${req.company.trim()}`);
  if (req.role?.trim()) lines.push(`Role: ${req.role.trim()}`);
  if (req.interviewType?.trim()) lines.push(`Interview type: ${req.interviewType.trim()}`);
  if (req.language?.trim()) lines.push(`Preferred answer language: ${req.language.trim()}`);
  lines.push("", "Review this answer and fill the JSON object as specified.");
  return lines.join("\n");
}

/** Extract JSON object from model output (strip optional fences). */
export function extractJsonObject(raw: string): string {
  let t = raw.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");
  }
  return t.trim();
}

export function parseReviewJsonResponse(raw: string): { ok: true; data: AiAnswerReviewResult } | { ok: false; error: string } {
  try {
    const extracted = extractJsonObject(raw);
    const parsed = JSON.parse(extracted) as unknown;
    const r = aiAnswerReviewResultSchema.safeParse(parsed);
    if (!r.success) {
      return { ok: false, error: r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
    }
    return { ok: true, data: r.data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Invalid JSON" };
  }
}

function clampScore(n: number): number {
  return Math.min(10, Math.max(0, Math.round(n * 10) / 10));
}

/** Deterministic local review — no network. */
export function runMockAnswerReview(req: AiAnswerReviewRequest): AiAnswerReviewResult {
  const text = req.userAnswer.trim();
  const len = text.length;
  const words = text.split(/\s+/).filter(Boolean);
  const wc = words.length;

  const baseScore = 4 + Math.min(4, Math.floor(len / 120)) + Math.min(2, Math.floor(wc / 40));
  const score = clampScore(baseScore);

  const strengths: string[] = [];
  if (len >= 80) strengths.push("Answer has enough substance to discuss trade-offs.");
  else strengths.push("You started a response — good baseline to expand.");
  if (/because|so that|therefore|result/i.test(text)) strengths.push("Uses causal connectors — helps interviewers follow logic.");
  if (/\d|%|percent|users|revenue|latency/i.test(text)) strengths.push("Includes quantifiable or concrete hints — strengthen with one more metric if true.");
  if (strengths.length < 2) strengths.push("Clear enough to iterate: add one concrete example next round.");

  const improvements: string[] = [];
  if (len < 120) improvements.push("Add a tight STAR skeleton: situation → task → action → result in 3–4 sentences.");
  if (!/result|impact|outcome|metric/i.test(text)) improvements.push("Close with one explicit outcome (even qualitative) tied to the role.");
  if (wc > 220) improvements.push("Trim repetition; keep one hero example and one backup detail.");
  if (improvements.length < 2) improvements.push("Read aloud: remove filler words and front-load the thesis in sentence one.");
  if (improvements.length < 2) improvements.push("Add one measurable proof point you can defend if probed.");

  const improvedVersion =
    len < 40
      ? `${text}\n\n(Expanded draft) In my last role, I owned [X], measured [Y], and delivered [Z] — which maps directly to ${req.role?.trim() || "this role"} because [tie to company mission or stack].`
      : `${text}\n\n(Edit) Lead with the outcome in sentence one, then one proof point, then what you want from this team at ${req.company?.trim() || "the company"}.`;

  const englishNotes =
    req.language === "portuguese"
      ? "Mix PT/EN only if the interview is bilingual; otherwise pick one language per answer. Prefer active voice: \"I shipped\" vs \"It was shipped\"."
      : "Prefer strong verbs (shipped, cut, scaled) over vague ones (helped, worked on). Keep sentences under 25 words for spoken delivery.";

  const followUpPrompt =
    req.interviewType === "behavioral"
      ? "Practice a 60-second STAR on a conflict with a peer — focus on actions you took, not blame."
      : "Record yourself answering: \"Why this company, why now, why you?\" in 45 seconds without reading.";

  return aiAnswerReviewResultSchema.parse({
    score,
    strengths: strengths.slice(0, 5),
    improvements: improvements.slice(0, 5),
    improvedVersion: improvedVersion.slice(0, 8000),
    englishNotes,
    followUpPrompt,
  });
}
