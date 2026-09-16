import type { Evidence } from "./evidence-types.js";
import { normalizeJobTextForIntel } from "./job-intelligence.js";

export const CLAIM_SAFETY_STATUSES = ["safe", "defensible", "remove"] as const;

export type ClaimSafety = (typeof CLAIM_SAFETY_STATUSES)[number];

export type ClaimAudit = {
  claim: string;
  supportingEvidence: Evidence[];
  status: ClaimSafety;
  reason: string;
};

function fold(value: string): string {
  return normalizeJobTextForIntel(value);
}

function blob(item: Evidence): string {
  return fold([item.label, item.description, ...(item.technologies ?? [])].join(" "));
}

const EXAGGERATIONS: { pattern: RegExp; reason: string }[] = [
  { pattern: /\bsenior python backend\b|\b5\+?\s*years?\s+python backend\b/i, reason: "Senior Python backend is not supported by automation-only evidence." },
  { pattern: /\baws architect\b|\b3\+?\s*years?\s+architecting aws\b/i, reason: "AWS architecture years are not supported." },
  { pattern: /\bproduction (llm|genai)\b|\bproduction generative ai\b/i, reason: "Production LLM/GenAI is not supported." },
  { pattern: /\bkafka\b/i, reason: "Kafka is not supported." },
  { pattern: /\bvector database\b/i, reason: "Vector database experience is not supported." },
  { pattern: /\bai agents?\b/i, reason: "AI Agents are not supported as professional experience." },
  { pattern: /\bstrong aws experience\b|\bprofessional aws\b|\baws architect/i, reason: "Professional AWS experience is not supported." },
  { pattern: /\bproduction ai agents?\b|\bbuilt production ai agents?\b/i, reason: "Production AI Agents are not supported." },
  { pattern: /\bc1\+?\b|\bc2\b|\bcertified english\b/i, reason: "Certified C1/C2 English is not recorded." },
];

function isExplicitDenial(text: string): boolean {
  return /\b(have not|has not|did not|do not|no professional|not built|rather than|is not|are not|do not claim|without claiming|not a c1|not certified)\b/i.test(
    text,
  );
}

export function auditClaim(claim: string, evidence: readonly Evidence[]): ClaimAudit {
  const text = claim.trim();
  const folded = fold(text);
  const usable = evidence.filter((item) => item.usableForClaims);
  const denial = isExplicitDenial(text);

  for (const rule of EXAGGERATIONS) {
    if (!rule.pattern.test(text)) continue;
    if (denial) continue;
    const explicit = usable.filter((item) => {
      const hay = blob(item);
      if (/automation|scripting|limited|not professional|no professional|no production/.test(hay)) return false;
      return rule.pattern.test(item.label) || rule.pattern.test(item.description);
    });
    if (explicit.length === 0) {
      return {
        claim: text,
        supportingEvidence: [],
        status: "remove",
        reason: rule.reason,
      };
    }
  }

  const direct = usable.filter((item) => {
    const hay = blob(item);
    const label = fold(item.label);
    return folded.includes(label) || (item.technologies ?? []).some((tech) => folded.includes(fold(tech)) && item.confidence !== "partial");
  });

  if (direct.some((item) => item.confidence === "verified" || item.confidence === "strong")) {
    return {
      claim: text,
      supportingEvidence: direct.slice(0, 4),
      status: "safe",
      reason: "Directly supported by recorded evidence.",
    };
  }

  const transferable = usable.filter((item) => {
    const hay = blob(item);
    return folded.split(/[^a-z0-9+#]+/).some((token) => token.length >= 4 && hay.includes(token));
  });

  if (transferable.length > 0) {
    return {
      claim: text,
      supportingEvidence: transferable.slice(0, 4),
      status: "defensible",
      reason: "Transferable or partial evidence exists; do not present as direct experience.",
    };
  }

  return {
    claim: text,
    supportingEvidence: [],
    status: "remove",
    reason: "No supporting evidence. Do not use this claim.",
  };
}

export function auditClaims(claims: readonly string[], evidence: readonly Evidence[]): ClaimAudit[] {
  return claims.map((claim) => auditClaim(claim, evidence));
}

export function recommendedClaims(audits: readonly ClaimAudit[]): ClaimAudit[] {
  return audits.filter((item) => item.status !== "remove");
}

export type ClaimAuditResult = {
  claims: ClaimAudit[];
  safeCount: number;
  defensibleCount: number;
  removedCount: number;
  finalSafe: ClaimAudit[];
};

export function buildClaimAuditResult(audits: readonly ClaimAudit[]): ClaimAuditResult {
  const claims = [...audits];
  return {
    claims,
    safeCount: claims.filter((item) => item.status === "safe").length,
    defensibleCount: claims.filter((item) => item.status === "defensible").length,
    removedCount: claims.filter((item) => item.status === "remove").length,
    finalSafe: recommendedClaims(claims),
  };
}

/** Split prose into claim-sized sentences without inventing content. */
export function splitTextClaims(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 8);
}

/**
 * Evidence → Claim Audit → Final Output.
 * REMOVE sentences never appear in the returned text.
 */
export function sanitizeTextWithClaimAudit(
  text: string,
  evidence: readonly Evidence[],
): { text: string; audit: ClaimAuditResult } {
  const parts = splitTextClaims(text);
  if (parts.length === 0) {
    const single = auditClaim(text, evidence);
    const audit = buildClaimAuditResult(text.trim() ? [single] : []);
    return {
      text: single.status === "remove" ? "" : text.trim(),
      audit,
    };
  }
  const audits = auditClaims(parts, evidence);
  const kept = audits.filter((item) => item.status !== "remove").map((item) => item.claim);
  return { text: kept.join(" ").trim(), audit: buildClaimAuditResult(audits) };
}
