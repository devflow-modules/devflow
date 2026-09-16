import type { CandidateInputRequest } from "./candidate-input.js";
import type { JobDecisionV2 } from "./application-decision-types.js";
import type { CandidateProfile } from "./profile-schema.js";
import type { Confidence } from "./types.js";

export type CompensationRecommendation = {
  currency?: string;
  publishedMin?: number;
  publishedMax?: number;
  target?: number;
  floor?: number;
  confidence: Confidence;
  reasoning: string[];
  needsCandidateInput: boolean;
};

function parseMoney(raw: string): number {
  return Number(raw.replace(/\./g, "").replace(",", ""));
}

function parsePublishedRange(jobText: string): { min?: number; max?: number; currency?: string } {
  const usd =
    jobText.match(/USD\s*(\d{1,3}(?:[.,]\d{3})+|\d{3,5})\s*[-–to]+\s*(\d{1,3}(?:[.,]\d{3})+|\d{3,5})/i) ??
    jobText.match(/\$\s*(\d{3,5})\s*[-–to]+\s*\$?\s*(\d{3,5})/);
  if (usd) return { min: parseMoney(usd[1]), max: parseMoney(usd[2]), currency: "USD" };
  const brl = jobText.match(/R\$\s*(\d{1,3}(?:[.,]\d{3})+|\d{3,5})\s*[-–to]+\s*(?:R\$\s*)?(\d{1,3}(?:[.,]\d{3})+|\d{3,5})/i);
  if (brl) return { min: parseMoney(brl[1]), max: parseMoney(brl[2]), currency: "BRL" };
  const generic = jobText.match(/(?:salary|compensation|range|faixa)\D{0,20}(\d{3,5})\s*[-–to]+\s*(\d{3,5})/i);
  if (generic) return { min: Number(generic[1]), max: Number(generic[2]) };
  const single = jobText.match(/USD\s*(\d{3,5})/i);
  if (single) return { min: Number(single[1]), currency: "USD" };
  return {};
}

function parseCandidateUsdMonthly(profile: CandidateProfile): number | undefined {
  const match = profile.salary.usdMonthly?.match(/(\d{1,3}(?:[.,]\d{3})+|\d{3,5})/);
  if (!match) return undefined;
  const n = parseMoney(match[1]);
  return Number.isFinite(n) ? n : undefined;
}

export function recommendCompensation(input: {
  jobText: string;
  profile: CandidateProfile;
  decision: JobDecisionV2;
  jobId?: string;
}): { recommendation: CompensationRecommendation; candidateInput?: CandidateInputRequest } {
  const published = parsePublishedRange(input.jobText);
  const preference = parseCandidateUsdMonthly(input.profile);
  const reasoning: string[] = [];

  if (published.min !== undefined && published.max !== undefined) {
    reasoning.push(`Published range ${published.currency ?? ""} ${published.min}–${published.max}.`.trim());
  }

  if (preference === undefined) {
    reasoning.push("No candidate salary preference is recorded — do not invent a floor.");
    if (published.min !== undefined) {
      reasoning.push("Published minimum is shown for context only; gaps must not auto-select that floor.");
    }
    return {
      recommendation: {
        currency: published.currency,
        publishedMin: published.min,
        publishedMax: published.max,
        confidence: "low",
        reasoning,
        needsCandidateInput: true,
      },
      candidateInput: {
        id: `input-comp-${input.jobId ?? "job"}`,
        question: "Qual é o seu alvo salarial (e piso) para esta vaga?",
        reason: "Compensation preference is missing.",
        relatedJobId: input.jobId,
        expectedType: "text",
        status: "pending",
        canBecomeEvidence: false,
      },
    };
  }

  reasoning.push(`Candidate preference recorded at USD ${preference}/month.`);
  if (published.min !== undefined) {
    reasoning.push("Do not auto-select the published minimum because of gaps.");
  }

  let target = preference;
  if (published.min !== undefined && published.max !== undefined) {
    const mid = Math.round((published.min + published.max) / 2);
    if (input.decision.dimensions.overall >= 80 && input.decision.eliminationRisk !== "high") {
      target = Math.max(preference, mid);
      reasoning.push("Strong fit: keep the recorded preference, not the published floor.");
    } else {
      target = Math.max(preference, mid);
      reasoning.push("Gaps do not justify bidding the published minimum.");
    }
  }

  return {
    recommendation: {
      currency: published.currency ?? "USD",
      publishedMin: published.min,
      publishedMax: published.max,
      target,
      floor: preference,
      confidence: "medium",
      reasoning,
      needsCandidateInput: false,
    },
  };
}
