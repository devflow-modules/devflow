import type { EvidenceMatch } from "./evidence-matching.js";

export const CANDIDATE_INPUT_STATUSES = ["pending", "answered", "dismissed"] as const;
export type CandidateInputStatus = (typeof CANDIDATE_INPUT_STATUSES)[number];

export const CANDIDATE_INPUT_TYPES = ["boolean", "years", "text", "enum"] as const;
export type CandidateInputExpectedType = (typeof CANDIDATE_INPUT_TYPES)[number];

export type CandidateInputRequest = {
  id: string;
  question: string;
  reason: string;
  relatedJobId?: string;
  relatedRequirementId?: string;
  expectedType: CandidateInputExpectedType;
  status: CandidateInputStatus;
  answer?: string;
  canBecomeEvidence: boolean;
};

function questionFor(label: string, requirementType: string): { question: string; expectedType: CandidateInputExpectedType } {
  if (requirementType === "years" || /\byears?\b/i.test(label)) {
    return {
      question: `Quantos anos de experiência profissional você tem com ${label.replace(/\s*\(\d+\+ years\)/, "").trim()}?`,
      expectedType: "years",
    };
  }
  if (requirementType === "language") {
    return { question: "Qual é o seu nível profissional de inglês?", expectedType: "enum" };
  }
  if (requirementType === "location" || requirementType === "work_model") {
    return { question: "Você atende ao modelo/local desta vaga?", expectedType: "boolean" };
  }
  if (requirementType === "schedule") {
    return {
      question: `Consegues manter o horário pedido (${label})? O anúncio pode não dizer se vale horário de verão.`,
      expectedType: "boolean",
    };
  }
  return {
    question: `Você já trabalhou profissionalmente com ${label}?`,
    expectedType: "boolean",
  };
}

export function buildCandidateInputRequests(input: {
  matches: readonly EvidenceMatch[];
  jobId?: string;
}): CandidateInputRequest[] {
  const out: CandidateInputRequest[] = [];
  for (const match of input.matches) {
    if (match.status !== "unknown") continue;
    const req = match.requirement;
    if (req.requirementType === "salary" || req.requirementType === "other") continue;
    const asked = questionFor(req.label, req.requirementType);
    out.push({
      id: `input-${req.id}`,
      question: asked.question,
      reason: match.reason,
      relatedJobId: input.jobId,
      relatedRequirementId: req.id,
      expectedType: asked.expectedType,
      status: "pending",
      canBecomeEvidence: true,
    });
  }
  return out;
}
