import type { ApplicationDecision, JobDecisionV2 } from "./application-decision-types.js";
import type { ClaimAudit } from "./claim-safety.js";
import type { EvidenceMatch } from "./evidence-matching.js";
import type { ApplyFlowJobSource } from "./job-match-types.js";
import { extractJobIntelligence, normalizeJobTextForIntel } from "./job-intelligence.js";
import type { CandidateProfile } from "./profile-schema.js";
import type { ResumeLibrary, ResumeVariant } from "./resume-library-types.js";
import { getDefaultResumeVariant } from "./resume-library.js";
import { recommendCurriculum } from "./curriculum-router.js";

export const RESUME_STRATEGIES_V2 = ["ats", "recruiter", "personalized_ats", "personalized_recruiter"] as const;
export type ResumeStrategyV2 = (typeof RESUME_STRATEGIES_V2)[number];

export type ResumeRecommendationV2 = {
  variant: ResumeVariant;
  strategy: ResumeStrategyV2;
  reason: string;
  confidence: "high" | "medium" | "low";
  recommendedHeadline?: string;
  sectionsToEmphasize: string[];
  sectionsToDeemphasize: string[];
  allowedKeywords: string[];
  forbiddenKeywords: string[];
};

function folded(text: string): string {
  return normalizeJobTextForIntel(text);
}

function recruiterChannel(jobText: string, source?: ApplyFlowJobSource): boolean {
  const text = folded(jobText);
  if (/\breferral\b|\breferred by\b|\brecruiter reached\b|\bdirect message\b|\binmail\b/.test(text)) return true;
  if (source === "paste" && /\brecruiter\b|\btalent partner\b/.test(text)) return true;
  return false;
}

function atsChannel(jobText: string, source?: ApplyFlowJobSource): boolean {
  const text = folded(jobText);
  if (source === "linkedin") return true;
  return /\bats\b|\beasy apply\b|\bworkday\b|\btaleo\b|\bgh[_\s-]?jobs\b|\bgreenhouse\b|\blever\b/.test(text);
}

function specificRequirements(matches: readonly EvidenceMatch[]): boolean {
  return matches.filter((item) => item.requirement.importance === "fundamental").length >= 3;
}

export function forbiddenKeywordsFromDecision(input: {
  matches: readonly EvidenceMatch[];
  removedClaims?: readonly ClaimAudit[];
}): string[] {
  const out = new Set<string>();
  for (const match of input.matches) {
    const hint = match.requirement.skillHint ?? match.requirement.label;
    const token = hint.replace(/\s*\(\d+\+ years\)/i, "").trim();
    if (match.status === "gap" && token) out.add(token);
    if (match.status === "unknown" && /edge function/i.test(match.requirement.label)) {
      out.add("Supabase Edge Functions");
    }
    if (match.status === "unknown" && /supabase storage/i.test(match.requirement.label)) {
      out.add("Supabase Storage");
    }
    if (match.status === "partial" && /supabase/i.test(match.requirement.label) && !/edge/i.test(match.requirement.label)) {
      out.add("Supabase Storage");
      out.add("Supabase Edge Functions");
    }
  }
  for (const claim of input.removedClaims ?? []) {
    if (/\baws\b/i.test(claim.claim)) out.add("AWS");
    if (/\bai agents?\b/i.test(claim.claim)) out.add("AI Agents");
    if (/\bkafka\b/i.test(claim.claim)) out.add("Kafka");
    if (/\bvector database\b/i.test(claim.claim)) out.add("vector database");
    if (/\bgenai\b|\bllm\b/i.test(claim.claim)) out.add("production LLM");
  }
  return [...out];
}

function allowedKeywords(matches: readonly EvidenceMatch[]): string[] {
  return matches
    .filter((item) => item.status === "proven" || item.status === "partial")
    .flatMap((item) => {
      if (item.status === "partial" && item.requirement.requirementType === "language") return [];
      if (item.status === "partial" && item.requirement.requirementType === "schedule") return [];
      const compoundSupabase =
        item.status === "partial" &&
        /supabase/i.test(item.requirement.label) &&
        !/edge/i.test(item.requirement.label);
      if (compoundSupabase) {
        return item.matchedEvidence
          .filter((evidence) => evidence.topic === "supabase.database" || evidence.topic === "supabase.auth")
          .map((evidence) => evidence.label);
      }
      return [item.requirement.skillHint ?? item.requirement.label];
    })
    .filter((item, index, all) => all.findIndex((other) => other.toLowerCase() === item.toLowerCase()) === index)
    .slice(0, 12);
}

function variantFromProfile(profile: CandidateProfile, now: Date): ResumeVariant {
  const iso = now.toISOString();
  return {
    id: "profile-default",
    name: profile.roles[0] ?? "Default profile",
    isDefault: true,
    createdAt: iso,
    updatedAt: iso,
    profile,
  };
}

export function recommendResumeV2(input: {
  jobText: string;
  decision: JobDecisionV2;
  profile: CandidateProfile;
  library?: ResumeLibrary;
  source?: ApplyFlowJobSource;
  now?: Date;
}): ResumeRecommendationV2 {
  const intel = extractJobIntelligence(input.jobText);
  const recruiter = recruiterChannel(input.jobText, input.source);
  const ats = atsChannel(input.jobText, input.source) && !recruiter;
  const stretch = input.decision.decision === "apply_stretch" || input.decision.careerUpside === "very_high";
  const specific = specificRequirements(input.decision.matches);
  const highPriority = input.decision.priority >= 70 || input.decision.decision === "apply_high";
  const personalize = (highPriority && specific) || stretch;

  let strategy: ResumeStrategyV2;
  if (recruiter && personalize) strategy = "personalized_recruiter";
  else if (ats && personalize) strategy = "personalized_ats";
  else if (recruiter) strategy = "recruiter";
  else strategy = "ats";

  const library = input.library;
  const ranked = library && library.variants.length >= 2
    ? recommendCurriculum({ skills: input.decision.matches.map((item) => item.requirement.skillHint ?? item.requirement.label) }, library, {
        now: input.now,
      })
    : undefined;
  const now = input.now ?? new Date();
  const variant = library
    ? library.variants.find((item) => item.id === ranked?.recommendedVariantId) ?? getDefaultResumeVariant(library)
    : variantFromProfile(input.profile, now);

  const forbidden = forbiddenKeywordsFromDecision({
    matches: input.decision.matches,
    removedClaims: input.decision.claims.filter((item) => item.status === "remove"),
  });
  const emphasize = [
    intel.roleType !== "unknown" ? intel.roleType : "product",
    ...input.decision.matches.filter((item) => item.status === "proven").map((item) => item.requirement.label),
  ].slice(0, 6);
  const deemphasize = forbidden.slice(0, 6);

  const reason = personalize
    ? stretch
      ? `Strategic/stretch role — ${strategy} so changes stay evidence-safe.`
      : `High priority with specific requirements — ${strategy}.`
    : recruiter
      ? "Direct recruiter/referral channel — recruiter-readable resume."
      : "ATS/portal channel — parseable resume without invented keywords.";

  const confidence = ranked?.confidence === "clear" || (highPriority && !stretch) ? "high" : stretch ? "medium" : "medium";

  return {
    variant,
    strategy,
    reason,
    confidence,
    recommendedHeadline: variant.profile.roles[0],
    sectionsToEmphasize: emphasize,
    sectionsToDeemphasize: deemphasize,
    allowedKeywords: allowedKeywords(input.decision.matches).filter((item) => !forbidden.some((bad) => item.toLowerCase().includes(bad.toLowerCase()))),
    forbiddenKeywords: forbidden,
  };
}

export function isApplyDecision(decision: ApplicationDecision): boolean {
  return decision === "apply_high" || decision === "apply_normal" || decision === "apply_stretch";
}
