import type { ApplyFlowApplicationV2Envelope, ApplyFlowApplicationV2Meta } from "./application-record-v2.js";
import { parseApplicationDecisionSnapshot } from "./application-decision-snapshot.js";
import type { ApplicationCareerEvent, ApplicationEffort, ApplicationOutcome } from "./career-analytics-types.js";
import { CAREER_EVENT_TYPES, CAREER_SOURCES, REJECTION_REASON_CATEGORIES, REJECTION_REASON_SOURCES } from "./career-analytics-types.js";
import type { CandidateInputRequest } from "./candidate-input.js";
import type { Contact, ContactInteraction } from "./contact-types.js";
import {
  CONTACT_INTERACTION_TYPES,
  CONTACT_STATUSES,
  CONTACT_TYPES,
  OUTREACH_CHANNELS,
  OUTREACH_LANGUAGES,
} from "./contact-types.js";
import type { Evidence } from "./evidence-types.js";
import { parseEvidence } from "./evidence-schema.js";
import { parseApplyFlowApplicationsImport } from "./imported-application-schema.js";
import { parseStoredApplyFlowJob } from "./imported-job-schema.js";
import type { ApplyFlowJob } from "./job-match-types.js";
import type { CandidateProfile } from "./profile-schema.js";
import { validateCandidateProfile } from "./profile-schema.js";
import { looksLikeCandidateProfile } from "./resume-library-schema.js";

export const APPLYFLOW_CAREER_BUNDLE_V2_VERSION = 2 as const;

export type ApplyFlowCareerBundleV2 = {
  version: typeof APPLYFLOW_CAREER_BUNDLE_V2_VERSION;
  profile?: CandidateProfile;
  evidence: Evidence[];
  jobs: ApplyFlowJob[];
  applications: ApplyFlowApplicationV2Envelope[];
  contacts: Contact[];
  interactions: ContactInteraction[];
  candidateInputs: CandidateInputRequest[];
  outcomes: ApplicationOutcome[];
  events: ApplicationCareerEvent[];
  efforts: ApplicationEffort[];
  extras?: Record<string, unknown>;
};

export type ParsedApplyFlowCareerBundle =
  | { ok: true; bundle: ApplyFlowCareerBundleV2; source: "v2" | "v1-applications" }
  | { ok: false; error: string };

const KNOWN_V2_KEYS = new Set([
  "version",
  "profile",
  "evidence",
  "jobs",
  "applications",
  "contacts",
  "interactions",
  "candidateInputs",
  "outcomes",
  "events",
  "efforts",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function extrasFrom(raw: Record<string, unknown>): Record<string, unknown> | undefined {
  const extras: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (KNOWN_V2_KEYS.has(key)) continue;
    extras[key] = value;
  }
  return Object.keys(extras).length ? extras : undefined;
}

function parseContact(raw: unknown): Contact | null {
  if (!isRecord(raw) || typeof raw.id !== "string" || typeof raw.name !== "string") return null;
  if (typeof raw.createdAt !== "string" || typeof raw.updatedAt !== "string") return null;
  if (!CONTACT_TYPES.includes(raw.type as Contact["type"])) return null;
  if (!CONTACT_STATUSES.includes(raw.status as Contact["status"])) return null;
  return {
    id: raw.id,
    name: raw.name,
    type: raw.type as Contact["type"],
    status: raw.status as Contact["status"],
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    ...(typeof raw.applicationId === "string" ? { applicationId: raw.applicationId } : {}),
    ...(typeof raw.companyId === "string" ? { companyId: raw.companyId } : {}),
    ...(typeof raw.company === "string" ? { company: raw.company } : {}),
    ...(typeof raw.jobId === "string" ? { jobId: raw.jobId } : {}),
    ...(typeof raw.role === "string" ? { role: raw.role } : {}),
    ...(OUTREACH_CHANNELS.includes(raw.channel as (typeof OUTREACH_CHANNELS)[number])
      ? { channel: raw.channel as Contact["channel"] }
      : {}),
    ...(OUTREACH_LANGUAGES.includes(raw.language as (typeof OUTREACH_LANGUAGES)[number])
      ? { language: raw.language as Contact["language"] }
      : {}),
    ...(typeof raw.linkedinUrl === "string" ? { linkedinUrl: raw.linkedinUrl } : {}),
    ...(typeof raw.email === "string" ? { email: raw.email } : {}),
    ...(typeof raw.subject === "string" ? { subject: raw.subject } : {}),
    ...(typeof raw.messageContent === "string" ? { messageContent: raw.messageContent } : {}),
    ...(typeof raw.sentAt === "string" ? { sentAt: raw.sentAt } : {}),
    ...(typeof raw.repliedAt === "string" ? { repliedAt: raw.repliedAt } : {}),
    ...(typeof raw.followUpAt === "string" ? { followUpAt: raw.followUpAt } : {}),
    ...(typeof raw.inMailCreditConsumed === "boolean"
      ? { inMailCreditConsumed: raw.inMailCreditConsumed }
      : {}),
    ...(typeof raw.inMailCredits === "number" ? { inMailCredits: raw.inMailCredits } : {}),
    ...(typeof raw.lastContactAt === "string" ? { lastContactAt: raw.lastContactAt } : {}),
    ...(typeof raw.nextActionAt === "string" ? { nextActionAt: raw.nextActionAt } : {}),
    ...(typeof raw.notes === "string" ? { notes: raw.notes } : {}),
    ...(typeof raw.archivedAt === "string" ? { archivedAt: raw.archivedAt } : {}),
  };
}

function parseInteraction(raw: unknown): ContactInteraction | null {
  if (!isRecord(raw) || typeof raw.id !== "string" || typeof raw.contactId !== "string") return null;
  if (typeof raw.occurredAt !== "string") return null;
  if (!CONTACT_INTERACTION_TYPES.includes(raw.type as ContactInteraction["type"])) return null;
  return {
    id: raw.id,
    contactId: raw.contactId,
    type: raw.type as ContactInteraction["type"],
    occurredAt: raw.occurredAt,
    ...(typeof raw.applicationId === "string" ? { applicationId: raw.applicationId } : {}),
    ...(typeof raw.jobId === "string" ? { jobId: raw.jobId } : {}),
    ...(OUTREACH_CHANNELS.includes(raw.channel as (typeof OUTREACH_CHANNELS)[number])
      ? { channel: raw.channel as ContactInteraction["channel"] }
      : {}),
    ...(typeof raw.subject === "string" ? { subject: raw.subject } : {}),
    ...(typeof raw.content === "string" ? { content: raw.content } : {}),
    ...(typeof raw.outcome === "string" ? { outcome: raw.outcome } : {}),
  };
}

function parseInputs(raw: unknown): CandidateInputRequest[] {
  if (!Array.isArray(raw)) return [];
  const out: CandidateInputRequest[] = [];
  for (const item of raw) {
    if (!isRecord(item) || typeof item.id !== "string" || typeof item.question !== "string") continue;
    if (typeof item.reason !== "string") continue;
    out.push({
      id: item.id,
      question: item.question,
      reason: item.reason,
      expectedType:
        item.expectedType === "boolean" || item.expectedType === "years" || item.expectedType === "enum"
          ? item.expectedType
          : "text",
      status: item.status === "answered" || item.status === "dismissed" ? item.status : "pending",
      canBecomeEvidence: item.canBecomeEvidence === true,
      ...(typeof item.relatedJobId === "string" ? { relatedJobId: item.relatedJobId } : {}),
      ...(typeof item.relatedRequirementId === "string" ? { relatedRequirementId: item.relatedRequirementId } : {}),
    });
  }
  return out;
}

function parseApplicationMeta(raw: unknown): ApplyFlowApplicationV2Meta | undefined {
  if (!isRecord(raw)) return undefined;
  const meta: ApplyFlowApplicationV2Meta = {};
  if (
    raw.decision === "apply_high" ||
    raw.decision === "apply_normal" ||
    raw.decision === "apply_stretch" ||
    raw.decision === "skip" ||
    raw.decision === "needs_info"
  ) {
    meta.decision = raw.decision;
  }
  if (typeof raw.priority === "number") meta.priority = raw.priority;
  if (typeof raw.hiringProbability === "string") meta.hiringProbability = raw.hiringProbability as ApplyFlowApplicationV2Meta["hiringProbability"];
  if (typeof raw.careerUpside === "string") meta.careerUpside = raw.careerUpside as ApplyFlowApplicationV2Meta["careerUpside"];
  if (typeof raw.eliminationRisk === "string") meta.eliminationRisk = raw.eliminationRisk as ApplyFlowApplicationV2Meta["eliminationRisk"];
  if (typeof raw.resumeVariant === "string") meta.resumeVariant = raw.resumeVariant;
  if (typeof raw.sourceJobId === "string") meta.sourceJobId = raw.sourceJobId;
  if (CONTACT_STATUSES.includes(raw.networkingStatus as Contact["status"])) {
    meta.networkingStatus = raw.networkingStatus as Contact["status"];
  }
  if (typeof raw.nextActionAt === "string") meta.nextActionAt = raw.nextActionAt;
  return Object.keys(meta).length ? meta : undefined;
}

function parseOutcomes(raw: unknown): ApplicationOutcome[] {
  if (!Array.isArray(raw)) return [];
  const out: ApplicationOutcome[] = [];
  for (const item of raw) {
    if (!isRecord(item) || typeof item.applicationId !== "string") continue;
    if (typeof item.createdAt !== "string" || typeof item.updatedAt !== "string") continue;
    const snapshot = parseApplicationDecisionSnapshot(item.snapshot);
    out.push({
      applicationId: item.applicationId,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      ...(typeof item.finalStatus === "string" ? { finalStatus: item.finalStatus as ApplicationOutcome["finalStatus"] } : {}),
      ...(typeof item.firstResponseAt === "string" ? { firstResponseAt: item.firstResponseAt } : {}),
      ...(typeof item.screeningAt === "string" ? { screeningAt: item.screeningAt } : {}),
      ...(typeof item.technicalAt === "string" ? { technicalAt: item.technicalAt } : {}),
      ...(typeof item.finalInterviewAt === "string" ? { finalInterviewAt: item.finalInterviewAt } : {}),
      ...(typeof item.offerAt === "string" ? { offerAt: item.offerAt } : {}),
      ...(typeof item.hiredAt === "string" ? { hiredAt: item.hiredAt } : {}),
      ...(typeof item.appliedAt === "string" ? { appliedAt: item.appliedAt } : {}),
      ...(typeof item.lastActivityAt === "string" ? { lastActivityAt: item.lastActivityAt } : {}),
      ...(typeof item.rejectedAt === "string" ? { rejectedAt: item.rejectedAt } : {}),
      ...(typeof item.withdrawnAt === "string" ? { withdrawnAt: item.withdrawnAt } : {}),
      ...(typeof item.rejectionReason === "string" ? { rejectionReason: item.rejectionReason } : {}),
      ...((REJECTION_REASON_CATEGORIES as readonly string[]).includes(String(item.rejectionReasonCategory))
        ? { rejectionReasonCategory: item.rejectionReasonCategory as ApplicationOutcome["rejectionReasonCategory"] }
        : {}),
      ...((REJECTION_REASON_SOURCES as readonly string[]).includes(String(item.rejectionReasonSource))
        ? { rejectionReasonSource: item.rejectionReasonSource as ApplicationOutcome["rejectionReasonSource"] }
        : {}),
      ...((CAREER_SOURCES as readonly string[]).includes(String(item.source)) ? { source: item.source as ApplicationOutcome["source"] } : {}),
      ...(typeof item.resumeVariant === "string" ? { resumeVariant: item.resumeVariant } : {}),
      ...(typeof item.resumeStrategy === "string" ? { resumeStrategy: item.resumeStrategy } : {}),
      ...(typeof item.networkingUsed === "boolean" ? { networkingUsed: item.networkingUsed } : {}),
      ...(typeof item.contactsCount === "number" ? { contactsCount: item.contactsCount } : {}),
      ...(typeof item.fitAtApplication === "number" ? { fitAtApplication: item.fitAtApplication } : {}),
      ...(typeof item.decisionAtApplication === "string"
        ? { decisionAtApplication: item.decisionAtApplication as ApplicationOutcome["decisionAtApplication"] }
        : {}),
      ...(typeof item.priorityAtApplication === "number" ? { priorityAtApplication: item.priorityAtApplication } : {}),
      ...(snapshot ? { snapshot } : {}),
    });
  }
  return out;
}

function parseEvents(raw: unknown): ApplicationCareerEvent[] {
  if (!Array.isArray(raw)) return [];
  const out: ApplicationCareerEvent[] = [];
  for (const item of raw) {
    if (!isRecord(item) || typeof item.id !== "string" || typeof item.applicationId !== "string") continue;
    if (typeof item.occurredAt !== "string") continue;
    if (!CAREER_EVENT_TYPES.includes(item.type as ApplicationCareerEvent["type"])) continue;
    out.push({
      id: item.id,
      applicationId: item.applicationId,
      type: item.type as ApplicationCareerEvent["type"],
      occurredAt: item.occurredAt,
      ...(typeof item.notes === "string" ? { notes: item.notes } : {}),
      ...(typeof item.fromStatus === "string"
        ? { fromStatus: item.fromStatus as ApplicationCareerEvent["fromStatus"] }
        : {}),
      ...(typeof item.toStatus === "string" ? { toStatus: item.toStatus as ApplicationCareerEvent["toStatus"] } : {}),
      ...(typeof item.source === "string" ? { source: item.source as ApplicationCareerEvent["source"] } : {}),
    });
  }
  return out;
}

function parseEfforts(raw: unknown): ApplicationEffort[] {
  if (!Array.isArray(raw)) return [];
  const out: ApplicationEffort[] = [];
  for (const item of raw) {
    if (!isRecord(item) || typeof item.applicationId !== "string") continue;
    out.push({
      applicationId: item.applicationId,
      ...(typeof item.applicationStartedAt === "string" ? { applicationStartedAt: item.applicationStartedAt } : {}),
      ...(typeof item.applicationSubmittedAt === "string" ? { applicationSubmittedAt: item.applicationSubmittedAt } : {}),
      ...(typeof item.personalizationMinutes === "number" ? { personalizationMinutes: item.personalizationMinutes } : {}),
      ...(typeof item.networkingMinutes === "number" ? { networkingMinutes: item.networkingMinutes } : {}),
      ...(typeof item.interviewPrepMinutes === "number" ? { interviewPrepMinutes: item.interviewPrepMinutes } : {}),
    });
  }
  return out;
}

function applicationsFromUnknown(raw: unknown): ApplyFlowApplicationV2Envelope[] {
  const parsed = parseApplyFlowApplicationsImport(raw);
  if (!parsed.ok) return [];
  const extras = Array.isArray(raw)
    ? raw
    : isRecord(raw) && Array.isArray(raw.applications)
      ? raw.applications
      : [];
  const byId = new Map<string, unknown>();
  for (const item of extras) {
    if (isRecord(item) && typeof item.id === "string") byId.set(item.id, item);
  }
  return parsed.applications.map((app) => {
    const source = byId.get(app.id);
    const v2 = isRecord(source) ? parseApplicationMeta(source.v2) : undefined;
    return v2 ? { ...app, v2 } : app;
  });
}

export function createApplyFlowCareerBundleV2(
  input: Partial<Omit<ApplyFlowCareerBundleV2, "version">> = {},
): ApplyFlowCareerBundleV2 {
  return {
    version: 2,
    evidence: input.evidence ?? [],
    jobs: input.jobs ?? [],
    applications: input.applications ?? [],
    contacts: input.contacts ?? [],
    interactions: input.interactions ?? [],
    candidateInputs: input.candidateInputs ?? [],
    outcomes: input.outcomes ?? [],
    events: input.events ?? [],
    efforts: input.efforts ?? [],
    ...(input.profile ? { profile: input.profile } : {}),
    ...(input.extras ? { extras: input.extras } : {}),
  };
}

export function serializeApplyFlowCareerBundleV2(bundle: ApplyFlowCareerBundleV2): Record<string, unknown> {
  return {
    version: 2,
    ...(bundle.profile ? { profile: bundle.profile } : {}),
    evidence: bundle.evidence,
    jobs: bundle.jobs,
    applications: bundle.applications,
    contacts: bundle.contacts,
    interactions: bundle.interactions,
    candidateInputs: bundle.candidateInputs,
    outcomes: bundle.outcomes,
    events: bundle.events,
    efforts: bundle.efforts,
    ...(bundle.extras ?? {}),
  };
}

export function parseApplyFlowCareerBundle(raw: unknown): ParsedApplyFlowCareerBundle {
  if (Array.isArray(raw)) {
    const applications = applicationsFromUnknown(raw);
    if (applications.length === 0) {
      return { ok: false, error: "Nenhum registo V1 válido encontrado." };
    }
    return { ok: true, source: "v1-applications", bundle: createApplyFlowCareerBundleV2({ applications }) };
  }

  if (!isRecord(raw)) {
    return { ok: false, error: "Bundle inválido." };
  }

  if (raw.version === 1 && Array.isArray(raw.applications)) {
    const applications = applicationsFromUnknown(raw);
    return { ok: true, source: "v1-applications", bundle: createApplyFlowCareerBundleV2({ applications, extras: extrasFrom(raw) }) };
  }

  if (raw.version !== 2) {
    if (Array.isArray(raw.applications)) {
      const applications = applicationsFromUnknown(raw);
      if (applications.length) {
        return { ok: true, source: "v1-applications", bundle: createApplyFlowCareerBundleV2({ applications, extras: extrasFrom(raw) }) };
      }
    }
    return { ok: false, error: "Versão de bundle não suportada." };
  }

  let profile: CandidateProfile | undefined;
  if (raw.profile !== undefined) {
    try {
      if (looksLikeCandidateProfile(raw.profile)) profile = validateCandidateProfile(raw.profile);
    } catch {
      return { ok: false, error: "Perfil do bundle V2 é inválido." };
    }
  }

  const evidence = Array.isArray(raw.evidence)
    ? raw.evidence.map(parseEvidence).filter((item): item is Evidence => Boolean(item))
    : [];
  const jobs = Array.isArray(raw.jobs) ? raw.jobs.map(parseStoredApplyFlowJob).filter((item): item is ApplyFlowJob => Boolean(item)) : [];
  const applications = applicationsFromUnknown(Array.isArray(raw.applications) ? raw.applications : []);
  const contacts = Array.isArray(raw.contacts) ? raw.contacts.map(parseContact).filter((item): item is Contact => Boolean(item)) : [];
  const interactions = Array.isArray(raw.interactions)
    ? raw.interactions.map(parseInteraction).filter((item): item is ContactInteraction => Boolean(item))
    : [];

  return {
    ok: true,
    source: "v2",
    bundle: createApplyFlowCareerBundleV2({
      profile,
      evidence,
      jobs,
      applications,
      contacts,
      interactions,
      candidateInputs: parseInputs(raw.candidateInputs),
      outcomes: parseOutcomes(raw.outcomes),
      events: parseEvents(raw.events),
      efforts: parseEfforts(raw.efforts),
      extras: extrasFrom(raw),
    }),
  };
}

export function parseApplyFlowCareerBundleJsonString(text: string): ParsedApplyFlowCareerBundle {
  try {
    return parseApplyFlowCareerBundle(JSON.parse(text) as unknown);
  } catch {
    return { ok: false, error: "Ficheiro não é JSON válido." };
  }
}

/** Interview Lab continues to consume CareerBundle 1.0 — this sidecar is optional and ignored by V1 parsers. */
export type ApplyFlowInterviewLabSidecarV2 = {
  schemaVersion: "applyflow-v2-sidecar";
  decision?: string;
  fitDimensions?: Record<string, number | undefined>;
  requirements?: { id: string; label: string; status: string }[];
  evidenceSummary?: string[];
  gaps?: string[];
  candidateInputs?: CandidateInputRequest[];
  recommendedCases?: { project: string; score: number; bestFor: string[] }[];
  salaryContext?: { publishedMin?: number; publishedMax?: number; target?: number; needsCandidateInput: boolean };
  applicationAnswers?: { questionType: string; status: string; recommendedAnswer?: string }[];
};

export function buildInterviewLabSidecarV2(input: {
  decision?: ApplyFlowApplicationV2Meta["decision"];
  fitDimensions?: Record<string, number | undefined>;
  requirements?: ApplyFlowInterviewLabSidecarV2["requirements"];
  evidenceSummary?: string[];
  gaps?: string[];
  candidateInputs?: CandidateInputRequest[];
  recommendedCases?: ApplyFlowInterviewLabSidecarV2["recommendedCases"];
  salaryContext?: ApplyFlowInterviewLabSidecarV2["salaryContext"];
  applicationAnswers?: ApplyFlowInterviewLabSidecarV2["applicationAnswers"];
}): ApplyFlowInterviewLabSidecarV2 {
  return {
    schemaVersion: "applyflow-v2-sidecar",
    ...input,
  };
}

export function extractInterviewLabSidecarV2(raw: unknown): ApplyFlowInterviewLabSidecarV2 | null {
  if (!isRecord(raw)) return null;
  const sidecar = isRecord(raw.applyflowV2) ? raw.applyflowV2 : raw.schemaVersion === "applyflow-v2-sidecar" ? raw : null;
  if (!sidecar || sidecar.schemaVersion !== "applyflow-v2-sidecar") return null;
  return sidecar as ApplyFlowInterviewLabSidecarV2;
}

export function isApplyFlowCareerBundleV2(raw: unknown): boolean {
  if (!isRecord(raw) || raw.version !== 2) return false;
  return (
    Array.isArray(raw.contacts) ||
    Array.isArray(raw.interactions) ||
    Array.isArray(raw.evidence) ||
    Array.isArray(raw.candidateInputs) ||
    Array.isArray(raw.outcomes) ||
    Array.isArray(raw.events) ||
    Array.isArray(raw.efforts) ||
    (raw.profile !== undefined && Array.isArray(raw.applications))
  );
}
