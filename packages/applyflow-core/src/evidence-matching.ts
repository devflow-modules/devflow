import type { Evidence } from "./evidence-types.js";
import type { JobRequirement } from "./job-requirement-types.js";
import { locationMentionsMatch, normalizeJobTextForIntel } from "./job-intelligence.js";
import {
  documentedYearsFromMonths,
  evidenceMonthRange,
  isJobScopedFact,
  unionDocumentedMonths,
  SUPABASE_COMPONENT_LABELS,
  type SupabaseComponentTopic,
} from "./recorded-facts.js";

export const EVIDENCE_MATCH_STATUSES = ["proven", "partial", "gap", "unknown"] as const;

export type EvidenceMatchStatus = (typeof EVIDENCE_MATCH_STATUSES)[number];

export type EvidenceMatch = {
  requirement: JobRequirement;
  status: EvidenceMatchStatus;
  matchedEvidence: Evidence[];
  reason: string;
};

function fold(value: string): string {
  return normalizeJobTextForIntel(value);
}

function tokens(value: string | undefined): string[] {
  if (!value) return [];
  return fold(value)
    .split(/[^a-z0-9+#]+/)
    .filter((item) => item.length >= 2);
}

function evidenceBlob(item: Evidence): string {
  return fold([item.label, item.description, ...(item.technologies ?? [])].join(" "));
}

function requirementBlob(req: JobRequirement): string {
  return fold([req.label, req.extractedText ?? "", req.skillHint ?? "", ...(req.qualifiers ?? [])].join(" "));
}

function hasAll(haystack: string, needles: string[]): boolean {
  return needles.every((needle) => haystack.includes(fold(needle)));
}

function hasAny(haystack: string, needles: string[]): boolean {
  return needles.some((needle) => haystack.includes(fold(needle)));
}

function isNegativeEvidence(item: Evidence): boolean {
  const blob = evidenceBlob(item);
  return (
    item.usableForClaims === false &&
    (/\bno professional\b|\bno production\b|\bnot professional\b|\bnot a\b|\bnot 3\b|\bnot 5\b|\blimited\b|\babout one year\b/.test(
      blob,
    ) ||
      item.confidence === "verified" && /\bno\b/.test(fold(item.label)))
  );
}

const GENERIC_OVERLAP_TOKENS = new Set([
  "year",
  "years",
  "experience",
  "professional",
  "total",
  "plus",
  "senior",
  "junior",
  "mid",
  "level",
  "required",
  "must",
  "have",
  "with",
  "and",
  "the",
  "for",
]);

export function yearsDeclaredInEvidence(item: Evidence): number | undefined {
  const range = evidenceMonthRange(item);
  if (range) {
    const months = unionDocumentedMonths([range]);
    if (months !== undefined) return documentedYearsFromMonths(months);
  }
  const match = evidenceBlob(item).match(/(\d+)\s*year/);
  if (!match) return undefined;
  const years = Number(match[1]);
  return Number.isFinite(years) ? years : undefined;
}

export function documentedYearsFromEvidence(items: readonly Evidence[], now: Date = new Date()): number | undefined {
  const ranges = items
    .map((item) => evidenceMonthRange(item, now))
    .filter((item): item is NonNullable<typeof item> => item !== undefined);
  const months = unionDocumentedMonths(ranges);
  return months === undefined ? undefined : documentedYearsFromMonths(months);
}

function transferableReason(req: JobRequirement, evidence: Evidence): string | null {
  const reqText = requirementBlob(req);
  const evText = evidenceBlob(evidence);

  if (hasAny(reqText, ["python"]) && hasAny(reqText, ["backend", "senior"]) && hasAny(evText, ["automation", "scripting", "rpa", "fastapi"])) {
    return "Python automation is related, not senior Python backend.";
  }
  if (hasAny(reqText, ["microservice", "distributed"]) && hasAny(evText, ["rest"]) && !hasAny(evText, ["microservice", "distributed"])) {
    return "REST API experience is not distributed microservices.";
  }
  if (hasAny(reqText, ["vector"]) && hasAny(evText, ["postgres", "postgresql"]) && !hasAny(evText, ["vector"])) {
    return "PostgreSQL is not a vector database.";
  }
  if (hasAny(reqText, ["agent"]) && hasAny(evText, ["automation"]) && !hasAny(evText, ["agent", "llm"])) {
    return "Automation is not AI Agents.";
  }
  if (hasAny(reqText, ["llm", "genai"]) && hasAny(reqText, ["production"]) && hasAny(evText, ["optional", "feature"]) && !hasAny(evText, ["production"])) {
    return "An optional AI feature is not a production LLM system.";
  }
  return null;
}

function isFalseFriend(req: JobRequirement, evidence: Evidence): boolean {
  const reqText = requirementBlob(req);
  const evText = evidenceBlob(evidence);
  if (hasAny(reqText, ["aws"]) && hasAny(evText, ["docker"]) && !hasAny(evText, ["aws"])) return true;
  if (hasAny(reqText, ["aws"]) && hasAny(evText, ["github", "actions", "ci"]) && !hasAny(evText, ["aws"])) return true;
  if (hasAny(reqText, ["aws"]) && hasAny(evText, ["docker"]) && !hasAny(evText, ["aws"])) return true;
  return false;
}

function skillOverlap(req: JobRequirement, evidence: Evidence): boolean {
  const hint = req.skillHint ? fold(req.skillHint) : "";
  const evTokens = new Set([...tokens(evidence.label), ...(evidence.technologies ?? []).map(fold)]);
  const evBlob = evidenceBlob(evidence);
  if (hint) {
    return evTokens.has(hint) || evBlob.includes(hint);
  }
  if (req.requirementType === "years") {
    return evidence.id === "profile-experience-total-years" || /total professional experience/.test(fold(evidence.label));
  }
  const reqTokens = new Set([...tokens(req.label), ...(req.qualifiers ?? []).map(fold)]);
  for (const token of reqTokens) {
    if (token.length < 3 || GENERIC_OVERLAP_TOKENS.has(token)) continue;
    if (evTokens.has(token)) return true;
  }
  return false;
}

function englishLevelFromEvidence(item: Evidence): "Basic" | "Intermediate" | "Advanced" | "Fluent" | undefined {
  const match = fold(item.label).match(/english\s*\((basic|intermediate|advanced|fluent)\)/);
  if (match?.[1] === "basic") return "Basic";
  if (match?.[1] === "intermediate") return "Intermediate";
  if (match?.[1] === "advanced") return "Advanced";
  if (match?.[1] === "fluent") return "Fluent";
  return undefined;
}

function englishComfortFromEvidence(item: Evidence): boolean | undefined {
  const blob = evidenceBlob(item);
  if (/comfortable in english: yes/.test(blob)) return true;
  if (/comfortable in english: no/.test(blob)) return false;
  return undefined;
}

function matchEnglish(req: JobRequirement, evidence: Evidence[]): EvidenceMatch | null {
  if (req.requirementType !== "language") return null;
  const englishEv = evidence.find((item) => item.id === "profile-language-english" || /^english\b/i.test(item.label));
  if (!englishEv) {
    return {
      requirement: req,
      status: "unknown",
      matchedEvidence: [],
      reason: "Not enough recorded evidence to conclude proven, partial, or gap.",
    };
  }
  const level = englishLevelFromEvidence(englishEv);
  const comfort = englishComfortFromEvidence(englishEv);
  const bar = (req.qualifiers ?? []).includes("fluent")
    ? "fluent"
    : (req.qualifiers ?? []).includes("advanced")
      ? "advanced"
      : (req.qualifiers ?? []).includes("professional")
        ? "professional"
        : "required";
  const spoken = (req.qualifiers ?? []).includes("spoken");
  const comfortText = comfort === true ? "yes" : comfort === false ? "no" : "unknown";

  if (bar === "fluent") {
    if (level === "Fluent" && (!spoken || comfort === true)) {
      return {
        requirement: req,
        status: "proven",
        matchedEvidence: [englishEv],
        reason: "Recorded Fluent English meets the posted Fluent bar.",
      };
    }
    if (level === "Fluent") {
      return {
        requirement: req,
        status: "partial",
        matchedEvidence: [englishEv],
        reason: `Posted bar is Fluent (written and spoken). Recorded level is Fluent. Comfort in English is ${comfortText}. Partial evidence is not confirmed fulfillment.`,
      };
    }
    if (level === "Basic" || (comfort === false && level !== "Intermediate" && level !== "Advanced")) {
      return {
        requirement: req,
        status: "gap",
        matchedEvidence: [englishEv],
        reason: `Posted bar is Fluent. Recorded level is ${level ?? "unknown"}. Comfort in English is ${comfortText}.`,
      };
    }
    return {
      requirement: req,
      status: "partial",
      matchedEvidence: [englishEv],
      reason: `Posted bar is Fluent. Recorded level is ${level ?? "unknown"}. Comfort in English is ${comfortText}. Partial evidence is not confirmed fluency.`,
    };
  }

  if ((bar === "advanced" || bar === "professional" || bar === "required") && (level === "Fluent" || level === "Advanced")) {
    if (spoken && comfort !== true) {
      return {
        requirement: req,
        status: "partial",
        matchedEvidence: [englishEv],
        reason: `Recorded English is ${level}. Comfort in English is ${comfortText}. Partial evidence is not confirmed spoken fulfillment.`,
      };
    }
    return {
      requirement: req,
      status: "proven",
      matchedEvidence: [englishEv],
      reason: "Direct evidence supports this requirement.",
    };
  }
  if (level === "Basic" && (bar === "advanced" || bar === "professional")) {
    return {
      requirement: req,
      status: "gap",
      matchedEvidence: [englishEv],
      reason: `Posted English bar is ${bar}. Recorded level is Basic.`,
    };
  }
  return {
    requirement: req,
    status: level ? "partial" : "unknown",
    matchedEvidence: level ? [englishEv] : [],
    reason: level
      ? `Recorded English is ${level}. Comfort in English is ${comfortText}. Partial evidence is not confirmed fulfillment.`
      : "Not enough recorded evidence to conclude proven, partial, or gap.",
  };
}

function matchCompoundTypeScriptBackend(req: JobRequirement, evidence: Evidence[]): EvidenceMatch | null {
  const reqText = requirementBlob(req);
  const isCompound =
    (req.skillHint === "TypeScript" && (req.qualifiers ?? []).includes("backend")) ||
    hasAll(reqText, ["typescript", "backend"]);
  if (!isCompound) return null;
  const joint = evidence.filter((item) => {
    if ((item.stance ?? "known") === "absent") return false;
    if (item.topic === "typescript.backend" && item.kind === "joint_skill") return item.usableForClaims;
    const blob = evidenceBlob(item);
    return hasAny(blob, ["typescript"]) && hasAny(blob, ["backend"]);
  });
  if (joint.length > 0) {
    return {
      requirement: req,
      status: "proven",
      matchedEvidence: joint.slice(0, 3),
      reason: "Direct evidence supports TypeScript used on the backend.",
    };
  }
  const related = evidence.filter((item) => hasAny(evidenceBlob(item), ["typescript"]) || hasAny(evidenceBlob(item), ["node.js", "nodejs", "node"]));
  return {
    requirement: req,
    status: "unknown",
    matchedEvidence: [],
    reason:
      related.length > 0
        ? "TypeScript and Node.js are recorded separately. That does not establish TypeScript on the backend."
        : "Not enough recorded evidence to conclude proven, partial, or gap.",
  };
}

function isSupabaseEdgeRequirement(req: JobRequirement): boolean {
  return /edge/.test(requirementBlob(req)) || fold(req.skillHint ?? "") === "supabase edge functions";
}

function isSupabaseProductRequirement(req: JobRequirement): boolean {
  return (fold(req.skillHint ?? "") === "supabase" || /^supabase$/i.test(req.label.trim())) && !isSupabaseEdgeRequirement(req);
}

function supabasePartsFromRequirement(req: JobRequirement): Array<Exclude<SupabaseComponentTopic, "supabase.edge_functions">> {
  const mentioned = (req.qualifiers ?? []).map(fold);
  const parts: Array<Exclude<SupabaseComponentTopic, "supabase.edge_functions">> = [];
  if (mentioned.includes("database") || mentioned.includes("postgres") || mentioned.includes("postgresql")) {
    parts.push("supabase.database");
  }
  if (mentioned.includes("auth")) parts.push("supabase.auth");
  if (mentioned.includes("storage")) parts.push("supabase.storage");
  return parts.length > 0 ? parts : ["supabase.database", "supabase.auth", "supabase.storage"];
}

function componentState(
  evidence: Evidence[],
  topic: SupabaseComponentTopic,
): { state: "known" | "absent" | "unknown"; items: Evidence[] } {
  const items = evidence.filter((item) => item.topic === topic);
  if (items.some((item) => item.stance === "absent")) {
    return { state: "absent", items: items.filter((item) => item.stance === "absent") };
  }
  const known = items.filter((item) => (item.stance ?? "known") === "known" && item.usableForClaims);
  if (known.length > 0) return { state: "known", items: known };
  return { state: "unknown", items: [] };
}

function matchSupabaseRequirement(req: JobRequirement, evidence: Evidence[]): EvidenceMatch | null {
  if (isSupabaseEdgeRequirement(req)) {
    const edge = componentState(evidence, "supabase.edge_functions");
    if (edge.state === "known") {
      return {
        requirement: req,
        status: "proven",
        matchedEvidence: edge.items.slice(0, 3),
        reason: "Recorded evidence supports Supabase Edge Functions specifically.",
      };
    }
    if (edge.state === "absent") {
      return {
        requirement: req,
        status: "gap",
        matchedEvidence: edge.items,
        reason: "Recorded evidence states no Supabase Edge Functions experience. Node.js or API work is not this requirement.",
      };
    }
    const related = evidence.filter((item) => hasAny(evidenceBlob(item), ["node", "nodejs", "rest", "api", "express"]));
    return {
      requirement: req,
      status: "unknown",
      matchedEvidence: [],
      reason:
        related.length > 0
          ? "Node.js or API experience is recorded. That does not establish Supabase Edge Functions."
          : "Not enough recorded evidence to conclude proven, partial, or gap.",
    };
  }
  if (!isSupabaseProductRequirement(req)) return null;
  const parts = supabasePartsFromRequirement(req);
  const states = parts.map((topic) => ({ topic, ...componentState(evidence, topic) }));
  const known = states.filter((item) => item.state === "known");
  const absent = states.filter((item) => item.state === "absent");
  const unknown = states.filter((item) => item.state === "unknown");
  const matched = known.flatMap((item) => item.items).slice(0, 3);
  const partLabel = (topic: SupabaseComponentTopic) => SUPABASE_COMPONENT_LABELS[topic];
  if (known.length === parts.length) {
    return {
      requirement: req,
      status: "proven",
      matchedEvidence: matched,
      reason: `Recorded evidence supports ${parts.map(partLabel).join(", ")}.`,
    };
  }
  if (known.length > 0 || absent.length > 0) {
    return {
      requirement: req,
      status: "partial",
      matchedEvidence: matched,
      reason: [
        known.length > 0 ? `Met: ${known.map((item) => partLabel(item.topic)).join(", ")}.` : null,
        unknown.length > 0 ? `Unknown: ${unknown.map((item) => partLabel(item.topic)).join(", ")}.` : null,
        absent.length > 0 ? `Declared absent: ${absent.map((item) => partLabel(item.topic)).join(", ")}.` : null,
        "Database/Auth do not prove Storage or Edge Functions.",
      ]
        .filter(Boolean)
        .join(" "),
    };
  }
  const anyBlob = evidence.map(evidenceBlob).join(" ");
  return {
    requirement: req,
    status: "unknown",
    matchedEvidence: [],
    reason: hasAny(anyBlob, ["postgres", "postgresql"])
      ? "PostgreSQL is recorded. That does not establish Supabase (database, auth, storage)."
      : "Not enough recorded evidence to conclude proven, partial, or gap.",
  };
}

function normalizeScheduleLabel(value: string): string {
  return fold(value)
    .replace(/[–—−]/g, "-")
    .replace(/\s*-\s*/g, "-")
    .replace(/\b0(\d)(:00)?\b/g, "$1$2")
    .replace(/\b(\d{1,2}):00\s*(am|pm)\b/g, "$1$2")
    .replace(/\s+/g, " ")
    .trim();
}

function matchSchedule(req: JobRequirement, evidence: Evidence[], jobId?: string): EvidenceMatch {
  const posted = req.extractedText ?? req.label;
  const dstAmbiguous = (req.qualifiers ?? []).includes("dst_ambiguous");
  const relevant = evidence.filter((item) => item.kind === "availability" && isJobScopedFact(item, jobId));
  if (relevant.length === 0) {
    return {
      requirement: req,
      status: "unknown",
      matchedEvidence: [],
      reason: `Online presence ${posted} is asked. Availability is not recorded, and the posting does not say whether daylight saving applies.`,
    };
  }
  const negative = relevant.filter(
    (item) => item.stance === "absent" || fold(item.declaredValue ?? "") === "cannot_meet",
  );
  if (negative.length > 0 && relevant.every((item) => negative.includes(item))) {
    return {
      requirement: req,
      status: "gap",
      matchedEvidence: negative,
      reason: `Recorded availability cannot meet ${posted}.`,
    };
  }
  const compatible = relevant.filter((item) => {
    const label = item.scheduleWindow?.label ?? item.declaredValue ?? "";
    const postedNorm = normalizeScheduleLabel(posted);
    const recordedNorm = normalizeScheduleLabel(label);
    return postedNorm.includes(recordedNorm) || recordedNorm.includes(postedNorm);
  });
  if (compatible.length === 0) {
    return {
      requirement: req,
      status: "unknown",
      matchedEvidence: [],
      reason: `Availability is recorded for a different window than ${posted}. Job-scoped facts were not treated as universal.`,
    };
  }
  const dstStillOpen =
    dstAmbiguous || compatible.some((item) => (item.scheduleWindow?.dstPolicy ?? "ambiguous") === "ambiguous");
  return {
    requirement: req,
    status: dstStillOpen ? "partial" : "proven",
    matchedEvidence: compatible.slice(0, 3),
    reason: dstStillOpen
      ? `Candidate confirmed the stated ${posted} window. The posting does not say whether daylight saving applies.`
      : `Recorded availability meets ${posted}.`,
  };
}

function isEducationRequirement(req: JobRequirement): boolean {
  return (req.qualifiers ?? []).includes("education") || /\b(college degree|four-year|bachelor)/i.test(req.label);
}

function mentionsSkill(item: Evidence, hint: string): boolean {
  const needle = fold(hint);
  const aliases = needle === "react" ? ["react", "next.js", "nextjs"] : [needle];
  const blob = `${evidenceBlob(item)} ${fold(item.topic ?? "")}`;
  return aliases.some((alias) => blob.includes(alias));
}

function matchEducationRequirement(req: JobRequirement, evidence: Evidence[]): EvidenceMatch | null {
  if (!isEducationRequirement(req)) return null;
  const relevant = evidence.filter((item) => {
    if (item.id === "profile-experience-total-years" || item.id.startsWith("profile-skill-")) return false;
    return /degree|bachelor|college|diploma|forma[cç][aã]o|educa/i.test(evidenceBlob(item));
  });
  const negatives = relevant.filter((item) => item.stance === "absent" || isNegativeEvidence(item));
  const positives = relevant.filter((item) => !negatives.includes(item));
  if (positives.length === 0 && negatives.length > 0) {
    return {
      requirement: req,
      status: "gap",
      matchedEvidence: negatives,
      reason: "Recorded evidence states this education requirement is not met.",
    };
  }
  if (positives.length === 0) {
    return {
      requirement: req,
      status: "unknown",
      matchedEvidence: [],
      reason:
        "A recorded degree is not available. A known skill or career duration does not satisfy this education requirement.",
    };
  }
  return {
    requirement: req,
    status: "proven",
    matchedEvidence: positives.slice(0, 3),
    reason: "Recorded education evidence supports the posted degree requirement.",
  };
}

function matchSkillYearsRequirement(req: JobRequirement, evidence: Evidence[]): EvidenceMatch | null {
  if (req.requirementType !== "years" || !req.skillHint || typeof req.minYears !== "number") return null;
  const hint = req.skillHint;
  const related = evidence.filter((item) => mentionsSkill(item, hint));
  const stanceAbsent = related.filter((item) => item.stance === "absent");
  const periods = related.filter(
    (item) => item.kind === "experience_period" && item.stance !== "absent" && !isNegativeEvidence(item),
  );
  if (periods.length === 0 && stanceAbsent.length > 0) {
    return {
      requirement: req,
      status: "gap",
      matchedEvidence: stanceAbsent,
      reason: `Recorded evidence states ${hint} experience is not present.`,
    };
  }
  if (periods.length === 0) return null;
  const unionYears = documentedYearsFromEvidence(periods);
  if (unionYears !== undefined) {
    const matched = periods.slice(0, 3);
    if (unionYears + 1e-9 >= req.minYears) {
      return {
        requirement: req,
        status: "proven",
        matchedEvidence: matched,
        reason: `Documented period covers ${unionYears.toFixed(1)} year(s) after merging overlaps. Periods may include backend work; exclusive ${hint} tenure was not required.`,
      };
    }
    return {
      requirement: req,
      status: req.mandatory ? "gap" : "partial",
      matchedEvidence: matched,
      reason: `Documented period covers ${unionYears.toFixed(1)} year(s) after merging overlaps; the posting asks for ${req.minYears}+.`,
    };
  }
  return null;
}

function matchYearsRequirement(req: JobRequirement, evidence: Evidence[]): EvidenceMatch | null {
  if (req.requirementType !== "years" || req.skillHint) return null;
  const periods = evidence.filter(
    (item) =>
      item.topic === "fullstack.period" ||
      (item.kind === "experience_period" && /full[\s-]?stack|professional experience/i.test(`${item.label} ${item.topic ?? ""}`)),
  );
  const unionYears = documentedYearsFromEvidence(periods);
  if (typeof req.minYears === "number" && unionYears !== undefined) {
    const matched = periods.slice(0, 3);
    if (unionYears + 1e-9 >= req.minYears) {
      return {
        requirement: req,
        status: "proven",
        matchedEvidence: matched,
        reason: `Documented period covers ${unionYears.toFixed(1)} year(s) after merging overlaps. This is not a declared career total.`,
      };
    }
    return {
      requirement: req,
      status: req.mandatory ? "gap" : "partial",
      matchedEvidence: matched,
      reason: `Documented period covers ${unionYears.toFixed(1)} year(s) after merging overlaps; the posting asks for ${req.minYears}+.`,
    };
  }
  return null;
}

export type EvidenceMatchOptions = {
  jobId?: string;
};

function matchOne(req: JobRequirement, evidence: Evidence[], options?: EvidenceMatchOptions): EvidenceMatch {
  if (req.requirementType === "language") {
    const english = matchEnglish(req, evidence);
    if (english) return english;
  }
  const education = matchEducationRequirement(req, evidence);
  if (education) return education;
  const compoundTs = matchCompoundTypeScriptBackend(req, evidence);
  if (compoundTs) return compoundTs;
  const supabase = matchSupabaseRequirement(req, evidence);
  if (supabase) return supabase;
  const skillYears = matchSkillYearsRequirement(req, evidence);
  if (skillYears) return skillYears;
  const years = matchYearsRequirement(req, evidence);
  if (years) return years;
  if (req.requirementType === "work_model") {
    const model = fold(req.extractedText ?? req.label);
    if (model.includes("remote")) {
      return {
        requirement: req,
        status: "proven",
        matchedEvidence: [],
        reason: "The posting is remote. Work model is not a skill gap; location and authorization are evaluated separately.",
      };
    }
    return {
      requirement: req,
      status: "unknown",
      matchedEvidence: [],
      reason: `Work model ${req.extractedText ?? req.label} is stated but candidate preference is not recorded.`,
    };
  }
  if (req.requirementType === "schedule") {
    return matchSchedule(req, evidence, options?.jobId);
  }
  if (req.requirementType === "salary") {
    return {
      requirement: req,
      status: "unknown",
      matchedEvidence: [],
      reason: `Compensation is mentioned${req.extractedText ? ` as "${req.extractedText}"` : ""}. Periodicity is ${
        (req.qualifiers ?? []).includes("annual")
          ? "annual"
          : (req.qualifiers ?? []).includes("monthly")
            ? "monthly"
            : (req.qualifiers ?? []).includes("hourly")
              ? "hourly"
              : "not stated"
      }. Financial compatibility stays pending.`,
    };
  }
  if (req.requirementType === "location") {
    const locationEv = evidence.find((item) => item.id === "profile-location" || /^location:/i.test(item.label));
    if (!locationEv) {
      return {
        requirement: req,
        status: "unknown",
        matchedEvidence: [],
        reason: "Work location is listed but candidate location is not recorded.",
      };
    }
    const mentioned = (req.qualifiers ?? []).filter((item) => item !== "remote");
    const candidate = locationEv.label.replace(/^location:\s*/i, "");
    const mentionedLabels = mentioned.length ? mentioned : (req.extractedText ?? "").split(",").map((item) => item.trim());
    if (locationMentionsMatch(candidate, mentionedLabels)) {
      return {
        requirement: req,
        status: "proven",
        matchedEvidence: [locationEv],
        reason: `Candidate location ${candidate.trim()} is geographically compatible with the posted locations. This is not a work-authorization decision.`,
      };
    }
    return {
      requirement: req,
      status: "unknown",
      matchedEvidence: [locationEv],
      reason: `Posting lists locations that do not clearly include ${candidate.trim()}. Work authorization is evaluated separately.`,
    };
  }
  const reqText = requirementBlob(req);
  const relevant = evidence.filter((item) => {
    if (isFalseFriend(req, item) && !skillOverlap(req, item)) return false;
    return skillOverlap(req, item) || Boolean(transferableReason(req, item));
  });

  if (relevant.length === 0) {
    const anyBlob = evidence.map(evidenceBlob).join(" ");
    let reason = "Not enough recorded evidence to conclude proven, partial, or gap.";
    if (hasAny(reqText, ["supabase"]) && !hasAny(reqText, ["edge"]) && hasAny(anyBlob, ["postgres", "postgresql"])) {
      reason = "PostgreSQL is recorded. That does not establish Supabase (database, auth, storage).";
    } else if (hasAny(reqText, ["edge"]) && hasAny(anyBlob, ["node", "nodejs", "rest", "api"])) {
      reason = "Node.js or API experience is recorded. That does not establish Supabase Edge Functions.";
    } else if (hasAny(reqText, ["rest"]) && hasAny(anyBlob, ["node", "nodejs"]) && !hasAny(anyBlob, ["rest"])) {
      reason = "Node.js is recorded. That does not establish REST.";
    }
    return {
      requirement: req,
      status: "unknown",
      matchedEvidence: [],
      reason,
    };
  }

  const negatives = relevant.filter(isNegativeEvidence);
  const positives = relevant.filter((item) => !isNegativeEvidence(item));

  if (positives.length === 0 && negatives.length > 0) {
    return {
      requirement: req,
      status: "gap",
      matchedEvidence: negatives,
      reason: negatives[0]?.description ?? "Recorded evidence states this is not present.",
    };
  }

  const best = positives[0];
  if (!best) {
    return {
      requirement: req,
      status: "unknown",
      matchedEvidence: [],
      reason: "Related mentions exist but are inconclusive.",
    };
  }

  const related = transferableReason(req, best);
  if (related) {
    return {
      requirement: req,
      status: "partial",
      matchedEvidence: [best],
      reason: related,
    };
  }

  const evYears = yearsDeclaredInEvidence(best);
  if (typeof req.minYears === "number" && evYears === undefined) {
    return {
      requirement: req,
      status: "unknown",
      matchedEvidence: [best],
      reason: `${req.label} is recorded but duration is not. The ${req.minYears}+ years bar stays unknown.`,
    };
  }
  if (typeof req.minYears === "number" && typeof evYears === "number" && evYears < req.minYears) {
    const knockout = Boolean(req.mandatory);
    return {
      requirement: req,
      status: knockout ? "gap" : "partial",
      matchedEvidence: [best],
      reason: knockout
        ? `Recorded ${evYears} year(s) is below the required ${req.minYears}+ years bar.`
        : `Evidence shows about ${evYears} year(s); the posting asks for ${req.minYears}+.`,
    };
  }

  const missingQualifiers = (req.qualifiers ?? []).filter((qualifier) => {
    const q = fold(qualifier);
    if (q === "senior") return false;
    return !evidenceBlob(best).includes(q) && !fold(best.label).includes(q);
  });
  if (missingQualifiers.includes("architecture") || missingQualifiers.includes("production") || missingQualifiers.includes("backend")) {
    return {
      requirement: req,
      status: "partial",
      matchedEvidence: [best],
      reason: `Related evidence exists, but ${missingQualifiers.join(", ")} is not established.`,
    };
  }

  if (hasAll(reqText, ["aws", "architecture"]) && !hasAny(evidenceBlob(best), ["architecture", "architecting"])) {
    return {
      requirement: req,
      status: "partial",
      matchedEvidence: [best],
      reason: "AWS contact is not the same as architecting AWS.",
    };
  }

  if (best.confidence === "partial" && (req.importance === "fundamental" || (req.qualifiers ?? []).length > 0)) {
    return {
      requirement: req,
      status: "partial",
      matchedEvidence: [best],
      reason: "Evidence is related or incomplete relative to the posted bar.",
    };
  }

  if (!best.usableForClaims && req.importance === "fundamental") {
    return {
      requirement: req,
      status: "partial",
      matchedEvidence: [best],
      reason: "Evidence exists but is not strong enough to support a direct claim.",
    };
  }

  const direct =
    (req.skillHint && hasAny(evidenceBlob(best), [req.skillHint])) ||
    hasAny(evidenceBlob(best), tokens(req.label).filter((item) => item.length >= 4));
  if (!direct && relevant.length > 0) {
    return {
      requirement: req,
      status: "unknown",
      matchedEvidence: [],
      reason: "Overlap is too weak to treat as a match or a gap.",
    };
  }

  return {
    requirement: req,
    status: "proven",
    matchedEvidence: positives.slice(0, 3),
    reason: "Direct evidence supports this requirement.",
  };
}

export function matchRequirementsToEvidence(
  requirements: readonly JobRequirement[],
  evidence: readonly Evidence[],
  options?: EvidenceMatchOptions,
): EvidenceMatch[] {
  return requirements.map((requirement) => matchOne(requirement, [...evidence], options));
}
