import {
  CONTACT_TYPES,
  CONTACT_CONFIDENCE_LEVELS,
  OUTREACH_LANGUAGES,
  OUTREACH_STATUSES,
  outreachStatusFromAlias,
  type Contact,
  type ContactConfidence,
  type ContactType,
  type OpportunityEvidence,
  type OutreachLanguage,
  type OutreachStatus,
  type OutreachStatusAlias,
} from "./contact-types.js";
import {
  JOB_MATCH_DECISIONS,
  JOB_MATCH_SCORING_VERSION,
  type ApplyFlowJob,
  type JobMatchDecision,
} from "./job-match-types.js";
import {
  isNetworkingStrategy,
  isOpportunityAvailabilityStatus,
  type JobNetworkingMeta,
  type NetworkingStrategy,
  type OpportunityAvailabilityStatus,
} from "./networking-strategy.js";
import { normalizeRecommendedCases } from "./recommended-cases.js";
import { INITIAL_SAVED_JOB_STATUS } from "./opportunity-queue.js";

export const OPPORTUNITY_PIPELINE_IMPORT_KIND = "applyflow-opportunity-pipeline" as const;
export const OPPORTUNITY_PIPELINE_IMPORT_VERSION = 1 as const;

export type OpportunityPipelineContactSeed = {
  name: string;
  linkedinUrl?: string;
  relation: ContactType;
  relationDescription?: string;
  confidence: ContactConfidence;
  evidenceNote?: string;
  evidence?: OpportunityEvidence;
  recommendedCases?: string[];
  outreachLanguage?: OutreachLanguage;
  outreachMessage?: string;
  outreachStatus?: OutreachStatus | OutreachStatusAlias;
  nextAction?: string;
};

export type OpportunityPipelineSeed = {
  company: string;
  role: string;
  matchScore: number;
  decision: JobMatchDecision;
  availabilityStatus?: OpportunityAvailabilityStatus;
  priority?: number;
  networkingStrategy?: NetworkingStrategy;
  recommendedCases?: string[];
  requisition?: string;
  location?: string;
  url?: string;
  description?: string;
  jobEvidence?: OpportunityEvidence;
  contact?: OpportunityPipelineContactSeed | null;
};

export type OpportunityPipelineImportDocument = {
  version: typeof OPPORTUNITY_PIPELINE_IMPORT_VERSION;
  kind: typeof OPPORTUNITY_PIPELINE_IMPORT_KIND;
  opportunities: OpportunityPipelineSeed[];
};

export type OpportunityPipelineImportResult =
  | {
      ok: true;
      jobs: ApplyFlowJob[];
      contacts: Contact[];
      ignoredCount: number;
    }
  | {
      ok: false;
      error: string;
      jobs: [];
      contacts: [];
      ignoredCount: number;
    };

const DECISION_ALIASES: Record<string, JobMatchDecision> = {
  apply: "apply",
  APPLY: "apply",
  apply_as_senior: "apply",
  APPLY_AS_SENIOR: "apply",
  stretch: "stretch",
  STRETCH: "stretch",
  secondary: "stretch",
  SECONDARY: "stretch",
  needs_info: "needs_info",
  skip: "skip",
};

const RELATION_ALIASES: Record<string, ContactType> = {
  hiring_manager: "hiring_manager",
  "team_member / hiring_manager-like": "team_member",
  team_member: "team_member",
  product_manager: "product_manager",
  recruiter: "recruiter",
  talent_acquisition: "talent_acquisition",
  people_ops: "people_ops",
  founder: "founder",
  vp_talent: "vp_talent",
  unknown: "other",
  other: "other",
};

const LANGUAGE_ALIASES: Record<string, OutreachLanguage> = {
  "pt-BR": "PT",
  "pt-br": "PT",
  pt: "PT",
  PT: "PT",
  en: "EN",
  EN: "EN",
  es: "ES",
  ES: "ES",
  Other: "Other",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function parseDecision(raw: unknown): JobMatchDecision | null {
  if (typeof raw !== "string") return null;
  const mapped = DECISION_ALIASES[raw] ?? (JOB_MATCH_DECISIONS.includes(raw as JobMatchDecision) ? (raw as JobMatchDecision) : null);
  return mapped;
}

function parseRelation(raw: unknown): ContactType | null {
  if (typeof raw !== "string") return null;
  const key = raw.trim();
  if (RELATION_ALIASES[key]) return RELATION_ALIASES[key];
  if ((CONTACT_TYPES as readonly string[]).includes(key)) return key as ContactType;
  return null;
}

function parseConfidence(raw: unknown): ContactConfidence | null {
  if (typeof raw !== "string") return null;
  return (CONTACT_CONFIDENCE_LEVELS as readonly string[]).includes(raw)
    ? (raw as ContactConfidence)
    : null;
}

function parseLanguage(raw: unknown): OutreachLanguage | undefined {
  if (typeof raw !== "string") return undefined;
  return LANGUAGE_ALIASES[raw] ?? ((OUTREACH_LANGUAGES as readonly string[]).includes(raw) ? (raw as OutreachLanguage) : undefined);
}

function parseOutreachStatus(raw: unknown): OutreachStatus | undefined {
  if (typeof raw !== "string") return undefined;
  if ((OUTREACH_STATUSES as readonly string[]).includes(raw)) return raw as OutreachStatus;
  const aliases = [
    "not_started",
    "ready",
    "sent",
    "connected",
    "replied",
    "follow_up_due",
    "closed",
  ] as const;
  if ((aliases as readonly string[]).includes(raw)) {
    return outreachStatusFromAlias(raw as OutreachStatusAlias);
  }
  return undefined;
}

function parseEvidence(raw: unknown): OpportunityEvidence | undefined {
  if (!isRecord(raw)) return undefined;
  const sourceType = asString(raw.sourceType);
  if (
    !sourceType ||
    !["linkedin", "company_careers", "ats", "manual", "other"].includes(sourceType)
  ) {
    return undefined;
  }
  return {
    sourceType: sourceType as OpportunityEvidence["sourceType"],
    ...(asString(raw.sourceUrl) ? { sourceUrl: asString(raw.sourceUrl) } : {}),
    ...(asString(raw.note) ? { note: asString(raw.note) } : {}),
    ...(asString(raw.verifiedAt) ? { verifiedAt: asString(raw.verifiedAt) } : {}),
  };
}

function parseContactSeed(raw: unknown): OpportunityPipelineContactSeed | null | undefined {
  if (raw == null) return null;
  if (!isRecord(raw)) return undefined;
  const name = asString(raw.name);
  const relation = parseRelation(raw.relation ?? raw.type);
  const confidence = parseConfidence(raw.confidence ?? raw.contactConfidence);
  if (!name || !relation || !confidence) return undefined;
  const recommended =
    normalizeRecommendedCases(
      Array.isArray(raw.recommendedCases)
        ? raw.recommendedCases.filter((item): item is string => typeof item === "string")
        : asString(raw.recommendedCase)
          ? [asString(raw.recommendedCase)!]
          : undefined,
    ) ?? undefined;
  const evidenceNote = asString(raw.evidenceNote) ?? asString(raw.evidence);
  return {
    name,
    relation,
    confidence,
    ...(asString(raw.linkedinUrl) ? { linkedinUrl: asString(raw.linkedinUrl) } : {}),
    ...(asString(raw.relationDescription) ? { relationDescription: asString(raw.relationDescription) } : {}),
    ...(evidenceNote ? { evidenceNote } : {}),
    ...(parseEvidence(raw.contactEvidence ?? raw.evidenceObject) ? { evidence: parseEvidence(raw.contactEvidence ?? raw.evidenceObject) } : {}),
    ...(recommended ? { recommendedCases: recommended } : {}),
    ...(parseLanguage(raw.outreachLanguage ?? raw.language) ? { outreachLanguage: parseLanguage(raw.outreachLanguage ?? raw.language) } : {}),
    ...(asString(raw.outreachMessage ?? raw.message) ? { outreachMessage: asString(raw.outreachMessage ?? raw.message) } : {}),
    ...(parseOutreachStatus(raw.outreachStatus ?? raw.status) ? { outreachStatus: parseOutreachStatus(raw.outreachStatus ?? raw.status) } : {}),
    ...(asString(raw.nextAction) ? { nextAction: asString(raw.nextAction) } : {}),
  };
}

function parseSeed(raw: unknown): OpportunityPipelineSeed | null {
  if (!isRecord(raw)) return null;
  const company = asString(raw.company);
  const role = asString(raw.role ?? raw.title);
  const matchScore = typeof raw.matchScore === "number" ? raw.matchScore : typeof raw.match === "number" ? raw.match : NaN;
  const decision = parseDecision(raw.decision);
  if (!company || !role || !Number.isFinite(matchScore) || matchScore < 0 || matchScore > 100 || !decision) {
    return null;
  }
  const strategyRaw = raw.networkingStrategy ?? raw.strategy;
  const availabilityRaw = raw.availabilityStatus ?? raw.status;
  const contactParsed = parseContactSeed(raw.contact);
  if (raw.contact != null && contactParsed === undefined) return null;

  const recommended =
    normalizeRecommendedCases(
      Array.isArray(raw.recommendedCases)
        ? raw.recommendedCases.filter((item): item is string => typeof item === "string")
        : asString(raw.recommendedCase)
          ? [asString(raw.recommendedCase)!]
          : undefined,
    ) ?? undefined;

  return {
    company,
    role,
    matchScore,
    decision,
    ...(isOpportunityAvailabilityStatus(availabilityRaw) ? { availabilityStatus: availabilityRaw } : {}),
    ...(typeof raw.priority === "number" && Number.isFinite(raw.priority) ? { priority: raw.priority } : {}),
    ...(isNetworkingStrategy(strategyRaw) ? { networkingStrategy: strategyRaw } : {}),
    ...(recommended ? { recommendedCases: recommended } : {}),
    ...(asString(raw.requisition) ? { requisition: asString(raw.requisition) } : {}),
    ...(asString(raw.location) ? { location: asString(raw.location) } : {}),
    ...(asString(raw.url) ? { url: asString(raw.url) } : {}),
    ...(asString(raw.description) ? { description: asString(raw.description) } : {}),
    ...(parseEvidence(raw.jobEvidence) ? { jobEvidence: parseEvidence(raw.jobEvidence) } : {}),
    contact: contactParsed === undefined ? undefined : contactParsed,
  };
}

function stableJobId(seed: OpportunityPipelineSeed, index: number): string {
  const key = `${seed.company}|${seed.role}|${seed.requisition ?? ""}|${seed.priority ?? index}`
    .toLowerCase()
    .replace(/[^a-z0-9|]+/g, "-");
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return `job_pipeline_${hash.toString(36)}_${index}`;
}

/**
 * Builds Jobs + Contacts from a private opportunity pipeline document.
 * Preserves manual match scores (does not re-evaluate).
 * Does not create Applications and never auto-sends outreach.
 */
export function importOpportunityPipeline(
  raw: unknown,
  options: { now?: Date } = {},
): OpportunityPipelineImportResult {
  if (!isRecord(raw)) {
    return { ok: false, error: "invalid_document", jobs: [], contacts: [], ignoredCount: 0 };
  }
  if (raw.kind !== OPPORTUNITY_PIPELINE_IMPORT_KIND) {
    return { ok: false, error: "unexpected_kind", jobs: [], contacts: [], ignoredCount: 0 };
  }
  if (raw.version !== OPPORTUNITY_PIPELINE_IMPORT_VERSION) {
    return { ok: false, error: "unsupported_version", jobs: [], contacts: [], ignoredCount: 0 };
  }
  if (!Array.isArray(raw.opportunities)) {
    return { ok: false, error: "missing_opportunities", jobs: [], contacts: [], ignoredCount: 0 };
  }

  const now = options.now ?? new Date();
  const iso = now.toISOString();
  const jobs: ApplyFlowJob[] = [];
  const contacts: Contact[] = [];
  let ignoredCount = 0;

  raw.opportunities.forEach((entry, index) => {
    const seed = parseSeed(entry);
    if (!seed) {
      ignoredCount += 1;
      return;
    }

    const networking: JobNetworkingMeta = {
      ...(seed.networkingStrategy ? { strategy: seed.networkingStrategy } : {}),
      ...(seed.priority != null ? { priority: seed.priority } : {}),
      ...(seed.availabilityStatus ? { availabilityStatus: seed.availabilityStatus } : {}),
      ...(seed.recommendedCases ? { recommendedCases: seed.recommendedCases } : {}),
      ...(seed.jobEvidence ? { evidence: seed.jobEvidence } : {}),
      manualMatchOverride: true,
    };

    const description =
      seed.description ??
      [
        `${seed.role} at ${seed.company}`,
        seed.requisition ? `Requisition: ${seed.requisition}` : undefined,
        seed.availabilityStatus ? `Availability: ${seed.availabilityStatus}` : undefined,
      ]
        .filter(Boolean)
        .join("\n");

    const jobId = stableJobId(seed, index);

    const job: ApplyFlowJob = {
      id: jobId,
      title: seed.role,
      company: seed.company,
      location: seed.location,
      url: seed.url,
      source: "json",
      status: INITIAL_SAVED_JOB_STATUS,
      jobContext: {
        skills: [],
        ...(Object.keys(networking).length ? { networking } : {}),
      },
      descriptionSnapshot: description.slice(0, 20_000),
      jobMatch: {
        score: seed.matchScore,
        decision: seed.decision,
        matchedSkills: [],
        missingSkills: [],
        evaluatedAt: iso,
        scoringVersion: JOB_MATCH_SCORING_VERSION,
      },
      createdAt: iso,
      updatedAt: iso,
    };
    jobs.push(job);

    if (!seed.contact) return;

    const message = seed.contact.outreachMessage?.trim();
    const status =
      seed.contact.outreachStatus ??
      (message ? "MESSAGE_PREPARED" : "IDENTIFIED");
    let resolvedStatus: OutreachStatus =
      typeof status === "string" && (OUTREACH_STATUSES as readonly string[]).includes(status)
        ? (status as OutreachStatus)
        : parseOutreachStatus(status) ?? (message ? "MESSAGE_PREPARED" : "IDENTIFIED");
    if (resolvedStatus === "MESSAGE_PREPARED" && !message) {
      resolvedStatus = "IDENTIFIED";
    }

    contacts.push({
      id: `contact_pipeline_${jobId}`,
      jobId,
      company: seed.company,
      name: seed.contact.name,
      type: seed.contact.relation,
      relationDescription: seed.contact.relationDescription ?? undefined,
      contactConfidence: seed.contact.confidence,
      evidenceNote: seed.contact.evidenceNote,
      contactEvidence: seed.contact.evidence ?? {
        sourceType: "manual",
        note: seed.contact.evidenceNote,
        verifiedAt: iso,
      },
      recommendedCases: seed.contact.recommendedCases ?? seed.recommendedCases,
      channel: "linkedin",
      language: seed.contact.outreachLanguage ?? "EN",
      linkedinUrl: seed.contact.linkedinUrl,
      status: resolvedStatus,
      messageContent: message,
      nextAction: seed.contact.nextAction,
      createdAt: iso,
      updatedAt: iso,
    });
  });

  return { ok: true, jobs, contacts, ignoredCount };
}

export function parseOpportunityPipelineImportJson(text: string, options?: { now?: Date }): OpportunityPipelineImportResult {
  try {
    return importOpportunityPipeline(JSON.parse(text) as unknown, options);
  } catch {
    return { ok: false, error: "invalid_json", jobs: [], contacts: [], ignoredCount: 0 };
  }
}
