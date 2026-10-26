import type { CandidateInputRequest } from "./candidate-input.js";
import type { JobDecisionV2 } from "./application-decision-types.js";
import { extractJobIntelligence, normalizeJobTextForIntel, type JobContractType } from "./job-intelligence.js";
import { salaryField, type CandidateProfile } from "./profile-schema.js";
import type { Confidence } from "./types.js";

export const COMPENSATION_CURRENCIES = ["BRL", "USD", "unknown"] as const;
export type CompensationCurrency = (typeof COMPENSATION_CURRENCIES)[number];

export const COMPENSATION_PERIODS = ["hourly", "monthly", "annual", "unknown"] as const;
export type CompensationPeriod = (typeof COMPENSATION_PERIODS)[number];

export const COMPENSATION_CONTEXTS = ["clt", "pj", "contractor", "unknown"] as const;
export type CompensationContext = (typeof COMPENSATION_CONTEXTS)[number];

export const COMPENSATION_COMPATIBILITY = ["compatible", "below_expectation", "unknown"] as const;
export type CompensationCompatibility = (typeof COMPENSATION_COMPATIBILITY)[number];

export type EmployerCompensation = {
  currency: CompensationCurrency;
  min?: number;
  max?: number;
  period: CompensationPeriod;
  employmentType: CompensationContext;
  source: "job_posting";
};

export type CandidateCompensationExpectation = {
  currency: CompensationCurrency;
  amount: number;
  period: CompensationPeriod;
  employmentType: CompensationContext;
  source: "candidate_preference";
  label: string;
};

export type CompensationRecommendation = {
  currency?: string;
  publishedMin?: number;
  publishedMax?: number;
  /** Not a declared expectation and not a midpoint of the employer range. */
  target?: number;
  floor?: number;
  confidence: Confidence;
  reasoning: string[];
  needsCandidateInput: boolean;
  employer?: EmployerCompensation;
  expectation?: CandidateCompensationExpectation;
  compatibility?: CompensationCompatibility;
};

function parseAmount(raw: string): number | undefined {
  const trimmed = raw.trim();
  let value: number;
  if (/^\d{1,3}(?:\.\d{3})+(?:,\d+)?$/.test(trimmed)) {
    value = Number(trimmed.replace(/\./g, "").replace(",", "."));
  } else if (/^\d{1,3}(?:,\d{3})+(?:\.\d+)?$/.test(trimmed)) {
    value = Number(trimmed.replace(/,/g, ""));
  } else if (/^\d+,\d{1,2}$/.test(trimmed)) {
    value = Number(trimmed.replace(",", "."));
  } else {
    value = Number(trimmed.replace(/[^\d.]/g, ""));
  }
  return Number.isFinite(value) ? value : undefined;
}

function periodOf(text: string): CompensationPeriod {
  const folded = normalizeJobTextForIntel(text);
  if (/\b(per hour|hourly|por hora)\b|\/\s*h(?:our|ora)?\b/.test(folded)) return "hourly";
  if (/\b(per month|monthly|mensal|por mes)\b|\/\s*m(?:onth|es)?\b/.test(folded)) return "monthly";
  if (/\b(per year|annually|annual|anual|por ano)\b|\/\s*(?:year|ano)\b/.test(folded)) return "annual";
  return "unknown";
}

function employmentOf(contract: JobContractType): CompensationContext {
  if (contract === "clt") return "clt";
  if (contract === "pj") return "pj";
  if (contract === "contractor") return "contractor";
  return "unknown";
}

export function parseEmployerCompensation(jobText: string): EmployerCompensation {
  const intel = extractJobIntelligence(jobText);
  const employmentType = employmentOf(intel.contractType);
  const period = periodOf(jobText);
  const brl = jobText.match(
    /(?:BRL|R\$)\s*(\d{1,3}(?:[.,]\d{3})+(?:,\d+)?|\d+(?:,\d{1,2})?)\s*(?:[-–—]|to|a)\s*(?:BRL|R\$)?\s*(\d{1,3}(?:[.,]\d{3})+(?:,\d+)?|\d+(?:,\d{1,2})?)/i,
  );
  const usd = jobText.match(
    /(?:USD|US\$)\s*(\d{1,3}(?:[.,]\d{3})+|\d+(?:\.\d+)?)\s*(?:[-–—]|to)\s*(?:USD|US\$)?\s*(\d{1,3}(?:[.,]\d{3})+|\d+(?:\.\d+)?)/i,
  );
  const brlSingle = jobText.match(/(?:BRL|R\$)\s*(\d{1,3}(?:[.,]\d{3})+(?:,\d+)?|\d+(?:,\d{1,2})?)/i);
  const usdSingle = jobText.match(/(?:USD|US\$)\s*(\d{1,3}(?:[.,]\d{3})+|\d+(?:\.\d+)?)/i);
  if (brl?.[1] && brl[2]) {
    return { currency: "BRL", min: parseAmount(brl[1]), max: parseAmount(brl[2]), period, employmentType, source: "job_posting" };
  }
  if (usd?.[1] && usd[2]) {
    return { currency: "USD", min: parseAmount(usd[1]), max: parseAmount(usd[2]), period, employmentType, source: "job_posting" };
  }
  if (brlSingle?.[1]) {
    const amount = parseAmount(brlSingle[1]);
    return { currency: "BRL", min: amount, max: amount, period, employmentType, source: "job_posting" };
  }
  if (usdSingle?.[1]) {
    const amount = parseAmount(usdSingle[1]);
    return { currency: "USD", min: amount, max: amount, period, employmentType, source: "job_posting" };
  }
  const usdTrailing = jobText.match(
    /\$\s*(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s*usd\b(?:\s*(?:[-–—]|to)\s*\$?\s*(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s*usd\b)?/i,
  );
  if (usdTrailing?.[1]) {
    const min = parseAmount(usdTrailing[1]);
    const max = usdTrailing[2] ? parseAmount(usdTrailing[2]) : min;
    return { currency: "USD", min, max, period, employmentType, source: "job_posting" };
  }
  const generic = jobText.match(/(?:salary|compensation|range|faixa)\D{0,24}(\d{3,6})\s*(?:[-–—]|to)\s*(\d{3,6})/i);
  if (generic?.[1] && generic[2]) {
    return {
      currency: "unknown",
      min: Number(generic[1]),
      max: Number(generic[2]),
      period,
      employmentType,
      source: "job_posting",
    };
  }
  const bare = jobText.match(/(?:^|[^\w])\$\s*(\d{1,3}(?:,\d{3})+|\d{3,6})/i);
  if (bare?.[1] && !/\b(?:usd|us\$|brl|r\$)\b/i.test(jobText)) {
    const amount = parseAmount(bare[1]);
    return { currency: "unknown", min: amount, max: amount, period, employmentType, source: "job_posting" };
  }
  return { currency: "unknown", period, employmentType, source: "job_posting" };
}

function expectationFrom(label: string | undefined, employmentType: CompensationContext): CandidateCompensationExpectation | undefined {
  if (!label?.trim()) return undefined;
  const parsed = parseEmployerCompensation(label);
  if (parsed.currency === "unknown" || parsed.min === undefined || parsed.period === "unknown") return undefined;
  return {
    currency: parsed.currency,
    amount: parsed.min,
    period: parsed.period,
    employmentType,
    source: "candidate_preference",
    label: label.trim(),
  };
}

export function selectCandidateExpectation(
  profile: CandidateProfile,
  employer: EmployerCompensation,
): CandidateCompensationExpectation | undefined {
  if (employer.employmentType === "clt") return expectationFrom(salaryField(profile, "cltSenior"), "clt");
  if (employer.employmentType === "pj") return expectationFrom(salaryField(profile, "pjSenior"), "pj");
  if (employer.employmentType === "contractor" && employer.period === "hourly") {
    return expectationFrom(salaryField(profile, "usdHourly"), "contractor");
  }
  if (employer.employmentType === "contractor" && (employer.period === "monthly" || employer.period === "annual")) {
    return expectationFrom(salaryField(profile, "usdMonthly"), "contractor");
  }
  return undefined;
}

function monthlyAmount(amount: number, period: CompensationPeriod): number | undefined {
  if (period === "monthly") return amount;
  if (period === "annual") return amount / 12;
  return undefined;
}

export function assessCompensationCompatibility(
  employer: EmployerCompensation,
  expectation: CandidateCompensationExpectation | undefined,
): { compatibility: CompensationCompatibility; reasoning: string[] } {
  const reasoning: string[] = [];
  if (employer.min === undefined && employer.max === undefined) {
    return { compatibility: "unknown", reasoning: ["Employer compensation is not stated. Compatibility is unknown."] };
  }
  if (employer.currency === "unknown") {
    return { compatibility: "unknown", reasoning: ["Employer currency is not reliable. No currency was guessed."] };
  }
  if (employer.period === "unknown") {
    return { compatibility: "unknown", reasoning: ["Employer pay period is not stated. No period was manufactured."] };
  }
  if (employer.employmentType === "unknown") {
    return { compatibility: "unknown", reasoning: ["Employment type is unspecified. No CLT, PJ or contractor preference was selected."] };
  }
  if (!expectation) {
    return { compatibility: "unknown", reasoning: ["No matching candidate preference is recorded for this employment context."] };
  }
  if (employer.currency !== expectation.currency) {
    return {
      compatibility: "unknown",
      reasoning: [`${employer.currency} and ${expectation.currency} are not compared without a conversion policy.`],
    };
  }
  if (employer.period === "hourly" || expectation.period === "hourly") {
    if (employer.period !== "hourly" || expectation.period !== "hourly") {
      return { compatibility: "unknown", reasoning: ["Hourly pay is not converted to a salary. Billable hours were not assumed."] };
    }
    const hourlyMax = employer.max ?? employer.min ?? 0;
    reasoning.push(`Candidate preference remains ${expectation.label}. It is not an approved offer or past earnings.`);
    reasoning.push(`Employer range remains ${employer.currency} ${employer.min ?? "?"}–${employer.max ?? employer.min} (hourly).`);
    if (hourlyMax < expectation.amount) {
      return {
        compatibility: "below_expectation",
        reasoning: [...reasoning, "The disclosed hourly range is entirely below the recorded preference. This is not a hard rejection."],
      };
    }
    return {
      compatibility: "compatible",
      reasoning: [...reasoning, "The disclosed hourly range reaches the recorded preference. Hours were not converted into a monthly salary."],
    };
  }
  const employerMonthlyMin = monthlyAmount(employer.min ?? employer.max ?? 0, employer.period);
  const employerMonthlyMax = monthlyAmount(employer.max ?? employer.min ?? 0, employer.period);
  const expectationMonthly = monthlyAmount(expectation.amount, expectation.period);
  if (employerMonthlyMin === undefined || employerMonthlyMax === undefined || expectationMonthly === undefined) {
    return { compatibility: "unknown", reasoning: ["The disclosed period cannot be compared with the recorded preference."] };
  }
  if (employer.period !== expectation.period) {
    reasoning.push("Annual and monthly amounts are compared after dividing a stated annual amount by 12. Taxes, bonuses and billable hours are not inferred.");
  }
  reasoning.push(`Candidate preference remains ${expectation.label}. It is not an approved offer or past earnings.`);
  reasoning.push(`Employer range remains ${employer.currency} ${employer.min ?? "?"}–${employer.max ?? employer.min} (${employer.period}).`);
  if (employerMonthlyMax < expectationMonthly) {
    return {
      compatibility: "below_expectation",
      reasoning: [...reasoning, "The disclosed range is entirely below the recorded preference. This is not a hard rejection."],
    };
  }
  return {
    compatibility: "compatible",
    reasoning: [...reasoning, "The disclosed range reaches the recorded preference. This is not a confirmed offer."],
  };
}

export function recommendCompensation(input: {
  jobText: string;
  profile: CandidateProfile;
  decision: JobDecisionV2;
  jobId?: string;
}): { recommendation: CompensationRecommendation; candidateInput?: CandidateInputRequest } {
  const employer = parseEmployerCompensation(input.jobText);
  const expectation = selectCandidateExpectation(input.profile, employer);
  const assessed = assessCompensationCompatibility(employer, expectation);
  const comparable = assessed.compatibility !== "unknown" && expectation !== undefined && employer.period === expectation.period;
  const needsCandidateInput = assessed.compatibility === "unknown";
  return {
    recommendation: {
      currency: employer.currency === "unknown" ? undefined : employer.currency,
      publishedMin: employer.min,
      publishedMax: employer.max,
      floor: comparable ? expectation.amount : undefined,
      confidence: assessed.compatibility === "unknown" ? "low" : "medium",
      reasoning: assessed.reasoning,
      needsCandidateInput,
      employer,
      expectation,
      compatibility: assessed.compatibility,
    },
    candidateInput: needsCandidateInput
      ? {
          id: `input-comp-${input.jobId ?? "job"}`,
          question: "Qual é a pretensão aplicável a esta vaga, com moeda, período e regime?",
          reason: assessed.reasoning[0] ?? "Compensation context is unresolved.",
          relatedJobId: input.jobId,
          expectedType: "text",
          status: "pending",
          canBecomeEvidence: false,
        }
      : undefined,
  };
}
