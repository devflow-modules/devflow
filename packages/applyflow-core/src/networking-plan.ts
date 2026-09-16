import type { JobDecisionV2 } from "./application-decision-types.js";
import { sanitizeTextWithClaimAudit } from "./claim-safety.js";
import type { Contact, ContactType } from "./contact-types.js";
import type { Evidence } from "./evidence-types.js";
import { extractJobIntelligence, normalizeJobTextForIntel } from "./job-intelligence.js";

export type NetworkingPlan = {
  recommendedOrder: ContactType[];
  firstContact: ContactType;
  reason: string;
  connectionRequest?: string;
  acceptedConnectionMessage?: string;
  followUpMessage?: string;
  stopConditions: string[];
};

function fold(text: string): string {
  return normalizeJobTextForIntel(text);
}

function recruiterFirst(jobText: string): boolean {
  const text = fold(jobText);
  return (
    /\btalent acquisition\b|\brecruiting team\b|\bhr business partner\b|\bplease apply via\b|\beasy apply\b|\bworkday\b/.test(
      text,
    ) && !/\breferral\b|\bengineering manager will review\b/.test(text)
  );
}

export function buildNetworkingPlan(input: {
  jobText: string;
  decision: JobDecisionV2;
  evidence: readonly Evidence[];
  companyName?: string;
  roleTitle?: string;
}): NetworkingPlan {
  const intel = extractJobIntelligence(input.jobText);
  const productish =
    intel.roleType === "frontend" ||
    intel.roleType === "fullstack" ||
    intel.roleType === "unknown" ||
    /\bproduct engineer\b|\bownership\b/.test(input.jobText);
  const qualitative =
    input.decision.decision === "apply_stretch" ||
    input.decision.careerUpside === "very_high" ||
    input.decision.careerUpside === "high";
  const centralized = recruiterFirst(input.jobText);

  let recommendedOrder: ContactType[];
  let reason: string;
  if (centralized) {
    recommendedOrder = ["recruiter", "engineering_manager", "head_of_engineering", "employee"];
    reason = "Process looks recruiter-centralized (ATS/HR language) — recruiter first.";
  } else if (productish && qualitative) {
    recommendedOrder = ["engineering_manager", "head_of_engineering", "cto", "recruiter"];
    reason =
      "Product/engineering role with qualitative stretch — engineering leadership before recruiter.";
  } else {
    recommendedOrder = ["recruiter", "engineering_manager", "employee"];
    reason = "Default recruiter-first when the hiring path is not clearly qualitative.";
  }

  const company = input.companyName ?? "the team";
  const role = input.roleTitle ?? "this role";
  const draft =
    `Hi — I work on product engineering with React, Next.js and TypeScript and would like to connect about ${role} at ${company}.`;
  const follow =
    `Following up on ${role}. Happy to share a concise product case if useful — no AWS/AI-agent claims.`;
  const connection = sanitizeTextWithClaimAudit(draft, input.evidence);
  const accepted = sanitizeTextWithClaimAudit(
    `Thanks for connecting. I applied for ${role} and can walk through a shipped SaaS case if helpful.`,
    input.evidence,
  );
  const followUp = sanitizeTextWithClaimAudit(follow, input.evidence);

  return {
    recommendedOrder,
    firstContact: recommendedOrder[0] ?? "recruiter",
    reason,
    connectionRequest: connection.text || undefined,
    acceptedConnectionMessage: accepted.text || undefined,
    followUpMessage: followUp.text || undefined,
    stopConditions: [
      "formal rejection",
      "strict knockout confirmed",
      "repeated no response",
      "candidate withdrawal",
      "role closed",
    ],
  };
}

export function sortContactsForPlan(contacts: readonly Contact[], plan: NetworkingPlan): Contact[] {
  const rank = new Map(plan.recommendedOrder.map((type, index) => [type, index]));
  return [...contacts].sort((a, b) => (rank.get(a.type) ?? 99) - (rank.get(b.type) ?? 99));
}
