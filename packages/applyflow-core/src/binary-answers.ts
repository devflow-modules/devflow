import type { ApplicationGate } from "./application-gates.js";
import type { ApplicationDecision, JobDecisionV2 } from "./application-decision-types.js";
import type { Evidence } from "./evidence-types.js";
import type { CandidateProfile } from "./profile-schema.js";
import { normalizeJobTextForIntel } from "./job-intelligence.js";

export type BinaryAnswer = "yes" | "no" | "unknown";

export type BinaryAnswerRecommendation = {
  id: string;
  question: string;
  answer: BinaryAnswer;
  evidenceIds: string[];
  risk: "low" | "medium" | "high";
  blocking: boolean;
  explanation: string;
  mandatory: boolean;
};

function fold(value: string): string {
  return normalizeJobTextForIntel(value);
}

function years(profile?: CandidateProfile): number | undefined {
  return profile?.facts.totalYearsExperience;
}

export function recommendBinaryAnswer(input: {
  question: string;
  profile?: CandidateProfile;
  evidence: readonly Evidence[];
  decision: JobDecisionV2;
  mandatory?: boolean;
}): BinaryAnswerRecommendation {
  const q = fold(input.question);
  const mandatory = Boolean(input.mandatory);
  const evidence = input.evidence;

  if (/\b5\s*\+?\s*years?\b/.test(q) && /\bsoftware|engineering|experience\b/.test(q)) {
    const total = years(input.profile);
    if (typeof total === "number" && total >= 5) {
      return {
        id: "bin-years-5",
        question: input.question,
        answer: "yes",
        evidenceIds: evidence.filter((item) => item.id.includes("total-years")).map((item) => item.id),
        risk: "low",
        blocking: false,
        mandatory,
        explanation: "Recorded total professional experience meets 5+ years.",
      };
    }
    return {
      id: "bin-years-5",
      question: input.question,
      answer: total === undefined ? "unknown" : "no",
      evidenceIds: [],
      risk: "high",
      blocking: mandatory && total !== undefined && total < 5,
      mandatory,
      explanation: total === undefined ? "Total years are not recorded." : "Recorded years are below the 5+ bar.",
    };
  }

  if (/\bprofessional aws\b|\baws experience\b|\bexperience with aws\b/.test(q)) {
    const aws = input.decision.matches.find((item) => /aws/i.test(item.requirement.label));
    const usable = evidence.filter((item) => item.usableForClaims && (item.technologies ?? []).some((t) => /aws/i.test(t)));
    if (usable.length && aws?.status === "proven") {
      return {
        id: "bin-aws",
        question: input.question,
        answer: "yes",
        evidenceIds: usable.map((item) => item.id),
        risk: "medium",
        blocking: false,
        mandatory,
        explanation: "Usable AWS evidence is recorded.",
      };
    }
    if (aws?.status === "gap" || evidence.some((item) => /limited aws|no professional aws/i.test(item.description))) {
      return {
        id: "bin-aws",
        question: input.question,
        answer: "no",
        evidenceIds: aws?.matchedEvidence.map((item) => item.id) ?? [],
        risk: "high",
        blocking: mandatory,
        mandatory,
        explanation: "AWS is a gap or only limited exposure is recorded.",
      };
    }
    return {
      id: "bin-aws",
      question: input.question,
      answer: "unknown",
      evidenceIds: [],
      risk: "medium",
      blocking: false,
      mandatory,
      explanation: "Not enough recorded information to answer AWS yes or no.",
    };
  }

  if (/\bproduction ai agents?\b|\bbuilt production ai agents?\b|\bai agents?\b/.test(q)) {
    const proven = input.decision.matches.find((item) => /agent/i.test(item.requirement.label) && item.status === "proven");
    if (proven) {
      return {
        id: "bin-ai-agents",
        question: input.question,
        answer: "yes",
        evidenceIds: proven.matchedEvidence.map((item) => item.id),
        risk: "medium",
        blocking: false,
        mandatory,
        explanation: "Direct AI Agent evidence is recorded.",
      };
    }
    return {
      id: "bin-ai-agents",
      question: input.question,
      answer: "no",
      evidenceIds: evidence.filter((item) => /genai|agent|llm/i.test(item.label)).map((item) => item.id),
      risk: "high",
      blocking: mandatory,
      mandatory,
      explanation: "Automation is not production AI Agents. No supporting evidence.",
    };
  }

  if (/\bc1\+?\b|\bc2\b|\bcertified english\b/.test(q)) {
    return {
      id: "bin-english-c1",
      question: input.question,
      answer: "unknown",
      evidenceIds: evidence.filter((item) => item.subject === "language").map((item) => item.id),
      risk: "medium",
      blocking: false,
      mandatory,
      explanation: "Advanced English is recorded; a C1 certificate is not.",
    };
  }

  return {
    id: `bin-${q.slice(0, 24).replace(/\s+/g, "-")}`,
    question: input.question,
    answer: "unknown",
    evidenceIds: [],
    risk: "medium",
    blocking: false,
    mandatory,
    explanation: "Yes is only recommended when the statement is literally defensible.",
  };
}

export function applyBinaryKnockouts(input: {
  decision: ApplicationDecision;
  gates: ApplicationGate[];
  binaries: readonly BinaryAnswerRecommendation[];
}): { decision: ApplicationDecision; gates: ApplicationGate[] } {
  const knockout = input.binaries.find((item) => item.mandatory && item.answer === "no");
  if (!knockout) return { decision: input.decision, gates: input.gates };
  const gate: ApplicationGate = {
    id: "gate-binary-knockout",
    type: "binary_knockout",
    label: knockout.question,
    required: true,
    result: "fail",
    reason: knockout.explanation,
  };
  const gates = input.gates.map((item) => (item.type === "binary_knockout" ? gate : item));
  if (!gates.some((item) => item.id === gate.id && item.result === "fail")) {
    gates.push(gate);
  }
  return { decision: "skip", gates };
}
