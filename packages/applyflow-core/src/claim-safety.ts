import type { Evidence } from "./evidence-types.js";
import {
  provenanceForEvidence,
  unsupportedManagementClaim,
  unsupportedMeasuredOutcome,
  wrongProjectAttribution,
  type EvidenceProvenance,
} from "./evidence-provenance.js";
import { normalizeJobTextForIntel } from "./job-intelligence.js";
import { technologyIdentities, textMentionsTechnology } from "./technology-identity.js";

export const CLAIM_SAFETY_STATUSES = ["safe", "defensible", "remove"] as const;

export type ClaimSafety = (typeof CLAIM_SAFETY_STATUSES)[number];

export type ClaimAudit = {
  claim: string;
  supportingEvidence: Evidence[];
  status: ClaimSafety;
  reason: string;
  provenance?: EvidenceProvenance;
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
  { pattern: /\bstrong aws experience\b|\bprofessional aws\b|\baws architect|\bproduction aws\b|\baws architecture\b/i, reason: "Professional AWS experience is not supported." },
  { pattern: /\bproduction ai agents?\b|\bbuilt production ai agents?\b/i, reason: "Production AI Agents are not supported." },
  { pattern: /\bc1\+?\b|\bc2\b|\bcertified english\b/i, reason: "Certified C1/C2 English is not recorded." },
  { pattern: /\bnative english\b|\bnative speaker\b|\bbilingual\b/i, reason: "Native or bilingual English is not a declared proficiency." },
];

export type DeclaredClaimFacts = {
  englishLevel?: string;
  salaryPreferences?: readonly string[];
  answerBankTexts?: readonly string[];
  resumeVariantId?: string;
  resumeVariantName?: string;
};

function isDeclaredEnglish(text: string, declared: DeclaredClaimFacts | undefined): boolean {
  if (!declared?.englishLevel) return false;
  const level = declared.englishLevel.toLowerCase();
  return new RegExp(`\\b(?:recorded|declared)\\s+english\\s+level:\\s*${level}\\b`, "i").test(text);
}

function isDeclaredSalary(text: string, declared: DeclaredClaimFacts | undefined): boolean {
  return (declared?.salaryPreferences ?? []).some((preference) => preference.trim().length > 0 && text.includes(preference.trim()));
}

function isLimitation(text: string): boolean {
  return /\b(not a c1|not certified|not native|not past earnings|not prior earnings|not previous compensation)\b/i.test(text);
}

function claimResult(
  claim: string,
  status: ClaimSafety,
  reason: string,
  supportingEvidence: Evidence[],
  declared?: DeclaredClaimFacts,
  support?: EvidenceProvenance["support"],
): ClaimAudit {
  const source = supportingEvidence[0];
  const provenance = source
    ? provenanceForEvidence(source, claim, {
        resumeId: declared?.resumeVariantId,
        support: support ?? (status === "safe" ? "direct" : "partial"),
      })
    : declared?.resumeVariantId
      ? {
          resumeId: declared.resumeVariantId,
          sourceKind: "candidate_declared" as const,
          ambiguous: false,
          support: support ?? "partial",
          sourceText: claim.slice(0, 280),
        }
      : undefined;
  return {
    claim,
    supportingEvidence,
    status,
    reason,
    ...(provenance ? { provenance } : {}),
  };
}

const GENERIC_CLAIM_TOKENS = new Set([
  "about",
  "build",
  "built",
  "experience",
  "engineer",
  "engineering",
  "professional",
  "project",
  "required",
  "senior",
  "software",
  "using",
  "work",
  "working",
  "years",
]);

function tokenSupported(token: string, hay: string): boolean {
  if (token.length < 4) return false;
  return textMentionsTechnology(hay, token);
}

function isExplicitDenial(text: string): boolean {
  return /\b(have not|has not|did not|do not|no professional|not built|rather than|is not|are not|do not claim|without claiming|not a c1|not certified)\b/i.test(
    text,
  );
}

export function auditClaim(claim: string, evidence: readonly Evidence[], declared?: DeclaredClaimFacts): ClaimAudit {
  const text = claim.trim();
  const folded = fold(text);
  const usable = evidence.filter((item) => item.usableForClaims);
  const denial = isExplicitDenial(text);
  if (isDeclaredEnglish(text, declared)) {
    if (/\b(native|bilingual|c2)\b/i.test(text) && !isLimitation(text)) {
      return {
        claim: text,
        supportingEvidence: [],
        status: "remove",
        reason: "Declared English proficiency is not native fluency or a certificate.",
      };
    }
    return claimResult(
      text,
      "defensible",
      "Candidate-declared English proficiency. Not a certificate or verified spoken fluency.",
      [],
      declared,
      "partial",
    );
  }
  if (isDeclaredSalary(text, declared)) {
    if (/\b(earned|previous salary|past compensation|historically paid)\b/i.test(text) && !isLimitation(text)) {
      return claimResult(text, "remove", "A salary preference is not evidence of past earnings.", [], declared, "unknown");
    }
    return claimResult(
      text,
      "defensible",
      "Candidate-declared compensation preference. Not prior earnings or an approved offer.",
      [],
      declared,
      "partial",
    );
  }
  if (isLimitation(text)) {
    return claimResult(text, "defensible", "The sentence limits a claim. It does not assert unsupported experience.", [], declared, "partial");
  }

  if (unsupportedMeasuredOutcome(text, usable)) {
    return claimResult(text, "remove", "A measured business outcome is not present in the selected evidence.", [], declared, "unknown");
  }
  if (unsupportedManagementClaim(text, usable)) {
    return claimResult(text, "remove", "A management headcount is not supported. Ownership is not people management.", [], declared, "unknown");
  }
  const projectIssue = wrongProjectAttribution(text, usable);
  if (projectIssue) {
    return claimResult(text, "remove", projectIssue, [], declared, "unknown");
  }
  if (!denial) {
    const claimIds = technologyIdentities(text);
    if (claimIds.size > 0) {
      const evidenceIds = technologyIdentities(usable.map((item) => blob(item)).join(" "));
      const missing = [...claimIds].filter((id) => !evidenceIds.has(id));
      if (missing.length > 0) {
        return claimResult(
          text,
          "remove",
          `Selected evidence does not support ${missing.join(", ")}.`,
          [],
          declared,
          "unknown",
        );
      }
    }
  }

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

  if ((declared?.answerBankTexts ?? []).some((item) => item.includes(text))) {
    return claimResult(
      text,
      "defensible",
      "Candidate-authored answer from the selected resume. Not new evidence.",
      [],
      declared,
      "partial",
    );
  }

  const direct = usable.filter((item) => {
    const label = fold(item.label);
    return folded.includes(label) || (item.technologies ?? []).some((tech) => tokenSupported(fold(tech), folded) && item.confidence !== "partial");
  });

  if (direct.some((item) => item.confidence === "verified" || item.confidence === "strong")) {
    const supportingEvidence = direct.slice(0, 4);
    return claimResult(text, "safe", "Directly supported by recorded evidence.", supportingEvidence, declared, "direct");
  }

  const transferable = usable.filter((item) => {
    const hay = blob(item);
    return folded.split(/[^a-z0-9+#]+/).some((token) => token.length >= 5 && !GENERIC_CLAIM_TOKENS.has(token) && tokenSupported(token, hay));
  });

  if (transferable.length > 0) {
    return claimResult(
      text,
      "defensible",
      "Transferable or partial evidence exists; do not present as direct experience.",
      transferable.slice(0, 4),
      declared,
      "partial",
    );
  }

  return claimResult(text, "remove", "No supporting evidence. Do not use this claim.", [], declared, "unknown");
}

export function auditClaims(
  claims: readonly string[],
  evidence: readonly Evidence[],
  declared?: DeclaredClaimFacts,
): ClaimAudit[] {
  return claims.map((claim) => auditClaim(claim, evidence, declared));
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
  declared?: DeclaredClaimFacts,
): { text: string; audit: ClaimAuditResult } {
  const parts = splitTextClaims(text);
  if (parts.length === 0) {
    const single = auditClaim(text, evidence, declared);
    const audit = buildClaimAuditResult(text.trim() ? [single] : []);
    return {
      text: single.status === "remove" ? "" : text.trim(),
      audit,
    };
  }
  const audits = auditClaims(parts, evidence, declared);
  const kept = audits.filter((item) => item.status !== "remove").map((item) => item.claim);
  return { text: kept.join(" ").trim(), audit: buildClaimAuditResult(audits) };
}
