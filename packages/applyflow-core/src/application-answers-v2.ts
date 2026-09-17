import type { CandidateInputRequest } from "./candidate-input.js";
import type { ClaimAuditResult } from "./claim-safety.js";
import { auditClaim, buildClaimAuditResult, sanitizeTextWithClaimAudit } from "./claim-safety.js";
import type { Evidence } from "./evidence-types.js";
import type { JobDecisionV2 } from "./application-decision-types.js";
import type { CandidateProfile } from "./profile-schema.js";

export const APPLICATION_ANSWER_TYPES = [
  "tell_me_about_yourself",
  "why_this_role",
  "why_company",
  "why_good_fit",
  "end_to_end_product",
  "react_next_node",
  "python",
  "aws",
  "ai_llm_agents",
  "english",
  "salary",
  "availability",
  "custom",
] as const;

export type ApplicationAnswerType = (typeof APPLICATION_ANSWER_TYPES)[number];

export const APPLICATION_ANSWER_STATUSES = ["ready", "needs_candidate_input", "not_recommended", "blocked"] as const;
export type ApplicationAnswerStatus = (typeof APPLICATION_ANSWER_STATUSES)[number];

export type ApplicationAnswer = {
  id: string;
  questionType: ApplicationAnswerType;
  question: string;
  recommendedAnswer?: string;
  status: ApplicationAnswerStatus;
  supportingEvidenceIds: string[];
  claimAudit: ClaimAuditResult;
  risk: "low" | "medium" | "high";
  candidateInputRequestId?: string;
};

const QUESTIONS: Record<Exclude<ApplicationAnswerType, "custom">, string> = {
  tell_me_about_yourself: "Tell me about yourself",
  why_this_role: "Why this role?",
  why_company: "Why this company?",
  why_good_fit: "Why are you a good fit?",
  end_to_end_product: "Describe an end-to-end product you owned",
  react_next_node: "What is your experience with React, Next.js and Node.js?",
  python: "What is your Python experience?",
  aws: "What is your AWS experience?",
  ai_llm_agents: "Have you built production AI / LLM / Agents systems?",
  english: "What is your English level?",
  salary: "What are your salary expectations?",
  availability: "What is your availability?",
};

function matchStatus(decision: JobDecisionV2, re: RegExp): "proven" | "partial" | "gap" | "unknown" | undefined {
  return decision.matches.find((item) => re.test(item.requirement.label))?.status;
}

function evidenceIds(decision: JobDecisionV2, re: RegExp): string[] {
  return decision.matches
    .filter((item) => re.test(item.requirement.label))
    .flatMap((item) => item.matchedEvidence.map((ev) => ev.id));
}

function answerOf(
  type: ApplicationAnswerType,
  question: string,
  text: string | undefined,
  evidence: readonly Evidence[],
  extras: Partial<ApplicationAnswer>,
): ApplicationAnswer {
  if (!text?.trim()) {
    return {
      id: `answer-${type}`,
      questionType: type,
      question,
      status: extras.status ?? "needs_candidate_input",
      supportingEvidenceIds: extras.supportingEvidenceIds ?? [],
      claimAudit: buildClaimAuditResult([]),
      risk: extras.risk ?? "medium",
      ...extras,
    };
  }
  const sanitized = sanitizeTextWithClaimAudit(text, evidence);
  if (!sanitized.text) {
    return {
      id: `answer-${type}`,
      questionType: type,
      question,
      status: "not_recommended",
      supportingEvidenceIds: extras.supportingEvidenceIds ?? [],
      claimAudit: sanitized.audit,
      risk: "high",
    };
  }
  return {
    id: `answer-${type}`,
    questionType: type,
    question,
    recommendedAnswer: sanitized.text,
    status: extras.status ?? "ready",
    supportingEvidenceIds: extras.supportingEvidenceIds ?? sanitized.audit.finalSafe.flatMap((item) => item.supportingEvidence.map((ev) => ev.id)),
    claimAudit: sanitized.audit,
    risk: extras.risk ?? "low",
    candidateInputRequestId: extras.candidateInputRequestId,
  };
}

export function generateApplicationAnswers(input: {
  profile: CandidateProfile;
  evidence: readonly Evidence[];
  decision: JobDecisionV2;
  companyName?: string;
  extraQuestions?: { id: string; question: string }[];
  jobId?: string;
}): { answers: ApplicationAnswer[]; candidateInputs: CandidateInputRequest[] } {
  const { profile, evidence, decision } = input;
  const inputs: CandidateInputRequest[] = [];
  const answers: ApplicationAnswer[] = [];

  const tell = profile.answerBank.tellUsAboutYourself.trim();
  if (!tell) {
    inputs.push({
      id: `input-tell-${input.jobId ?? "job"}`,
      question: "Como te apresentas nesta candidatura?",
      reason: "Tell me about yourself is not recorded in the answer bank.",
      relatedJobId: input.jobId,
      expectedType: "text",
      status: "pending",
      canBecomeEvidence: false,
    });
  }
  answers.push(
    answerOf("tell_me_about_yourself", QUESTIONS.tell_me_about_yourself, tell || undefined, evidence, {
      status: tell ? "ready" : "needs_candidate_input",
      candidateInputRequestId: tell ? undefined : `input-tell-${input.jobId ?? "job"}`,
      risk: "low",
    }),
  );

  const whyFit = profile.answerBank.whyGoodFit.trim();
  answers.push(answerOf("why_good_fit", QUESTIONS.why_good_fit, whyFit || undefined, evidence, { risk: "low" }));

  inputs.push({
    id: `input-why-role-${input.jobId ?? "job"}`,
    question: "Por que esta função, em concreto?",
    reason: "Role motivation is not recorded. Do not invent a personal reason.",
    relatedJobId: input.jobId,
    expectedType: "text",
    status: "pending",
    canBecomeEvidence: false,
  });
  answers.push(
    answerOf("why_this_role", QUESTIONS.why_this_role, undefined, evidence, {
      status: "needs_candidate_input",
      candidateInputRequestId: `input-why-role-${input.jobId ?? "job"}`,
      risk: "medium",
    }),
  );

  inputs.push({
    id: `input-why-company-${input.jobId ?? "job"}`,
    question: "Por que esta empresa, em concreto?",
    reason: "Company motivation is not recorded. Do not invent a personal reason.",
    relatedJobId: input.jobId,
    expectedType: "text",
    status: "pending",
    canBecomeEvidence: false,
  });
  answers.push(
    answerOf("why_company", QUESTIONS.why_company, undefined, evidence, {
      status: "needs_candidate_input",
      candidateInputRequestId: `input-why-company-${input.jobId ?? "job"}`,
      risk: "medium",
    }),
  );

  const product = evidence.find((item) => item.subject === "project" && item.usableForClaims);
  answers.push(
    answerOf(
      "end_to_end_product",
      QUESTIONS.end_to_end_product,
      product ? `${product.label}. ${product.description}` : profile.answerBank.productCase.trim(),
      evidence,
      { supportingEvidenceIds: product ? [product.id] : [], risk: "low" },
    ),
  );

  answers.push(
    answerOf(
      "react_next_node",
      QUESTIONS.react_next_node,
      "I have professional experience building production web products with React, Next.js, TypeScript and Node.js.",
      evidence,
      { supportingEvidenceIds: evidence.filter((item) => (item.technologies ?? []).some((t) => /react|next|node/i.test(t))).map((item) => item.id), risk: "low" },
    ),
  );

  const pythonStatus = matchStatus(decision, /python/i);
  const pythonText =
    pythonStatus === "proven"
      ? "I have professional Python experience on backend services."
      : "I use Python professionally for automation, integrations and some FastAPI work. That is not senior Python backend experience.";
  answers.push(
    answerOf("python", QUESTIONS.python, pythonText, evidence, {
      supportingEvidenceIds: evidenceIds(decision, /python/i),
      risk: pythonStatus === "proven" ? "low" : "medium",
    }),
  );

  const awsStatus = matchStatus(decision, /aws/i);
  const awsText =
    awsStatus === "proven"
      ? "I have professional AWS experience aligned with the posting."
      : "My professional deployment experience is primarily with Docker, GitHub Actions, Vercel and Railway rather than AWS.";
  const awsAudit = auditClaim("I have strong AWS experience.", evidence);
  answers.push(
    answerOf("aws", QUESTIONS.aws, awsText, evidence, {
      supportingEvidenceIds: evidenceIds(decision, /aws/i),
      status: awsAudit.status === "safe" ? "ready" : "ready",
      risk: awsStatus === "proven" ? "low" : "high",
    }),
  );

  const aiStatus = matchStatus(decision, /agent|genai|llm/i);
  const aiText =
    "I have not built production AI Agents or production LLM systems. Automation and optional AI features are not the same as that experience.";
  answers.push(
    answerOf("ai_llm_agents", QUESTIONS.ai_llm_agents, aiText, evidence, {
      supportingEvidenceIds: evidenceIds(decision, /agent|genai|llm/i),
      status: aiStatus === "proven" ? "ready" : "ready",
      risk: "high",
    }),
  );

  const english = profile.facts.englishLevel ?? profile.englishLevel;
  if (!english) {
    inputs.push({
      id: `input-english-${input.jobId ?? "job"}`,
      question: "Qual é o seu nível de inglês para esta vaga?",
      reason: "English level is not recorded. Do not invent fluency.",
      relatedJobId: input.jobId,
      expectedType: "text",
      status: "pending",
      canBecomeEvidence: true,
    });
  }
  answers.push(
    answerOf(
      "english",
      QUESTIONS.english,
      english ? `Recorded English level: ${english}. This is not a C1 certificate.` : undefined,
      evidence,
      {
        status: english ? "ready" : "needs_candidate_input",
        candidateInputRequestId: english ? undefined : `input-english-${input.jobId ?? "job"}`,
        risk: "low",
      },
    ),
  );

  const salaryPref = profile.salary.usdMonthly?.trim() ?? "";
  if (!salaryPref) {
    inputs.push({
      id: `input-salary-${input.jobId ?? "job"}`,
      question: "Qual é a sua pretensão salarial para esta vaga?",
      reason: "Salary preference is not recorded. Do not invent a floor.",
      relatedJobId: input.jobId,
      expectedType: "text",
      status: "pending",
      canBecomeEvidence: false,
    });
  }
  answers.push(
    answerOf("salary", QUESTIONS.salary, salaryPref || undefined, evidence, {
      status: salaryPref ? "ready" : "needs_candidate_input",
      candidateInputRequestId: salaryPref ? undefined : `input-salary-${input.jobId ?? "job"}`,
      risk: "high",
    }),
  );

  const scopedHours = evidence.find(
    (item) =>
      item.kind === "availability" &&
      item.origin === "candidate_declaration" &&
      item.stance === "known" &&
      (!item.relatedJobId || item.relatedJobId === input.jobId),
  );
  const availability =
    profile.facts.availability?.trim() ||
    profile.answerBank.availability.trim() ||
    (scopedHours?.scheduleWindow
      ? `Confirmed for this posting only: ${scopedHours.scheduleWindow.label}. Daylight-saving / EST vs EDT stays ambiguous because the posting does not specify it. This is not universal availability.`
      : "");
  if (!availability) {
    inputs.push({
      id: `input-availability-${input.jobId ?? "job"}`,
      question: "Qual é a sua disponibilidade para começar?",
      reason: "Availability is not recorded.",
      relatedJobId: input.jobId,
      expectedType: "text",
      status: "pending",
      canBecomeEvidence: true,
    });
  }
  answers.push(
    answerOf("availability", QUESTIONS.availability, availability || undefined, evidence, {
      status: availability ? "ready" : "needs_candidate_input",
      supportingEvidenceIds: scopedHours ? [scopedHours.id] : [],
      candidateInputRequestId: availability ? undefined : `input-availability-${input.jobId ?? "job"}`,
      risk: "medium",
    }),
  );

  for (const extra of input.extraQuestions ?? []) {
    answers.push(answerOf("custom", extra.question, undefined, evidence, { status: "needs_candidate_input" }));
  }

  return { answers, candidateInputs: inputs };
}
