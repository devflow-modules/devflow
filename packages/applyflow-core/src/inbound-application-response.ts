import type { ApplyFlowApplication } from "./application-types.js";
import {
  canTransitionApplicationStatus,
  resolvePipelineStatus,
} from "./application-lifecycle.js";
import type { ApplicationOutcome } from "./career-analytics-types.js";
import {
  APPLYFLOW_PIPELINE_STATUS_V2_LABELS_PT,
  toPipelineStatusV2,
  type ApplyFlowPipelineStatusV2,
} from "./pipeline-status.js";
import type { Confidence } from "./types.js";

export const INBOUND_RESPONSE_KINDS = [
  "application_acknowledged",
  "recruiter_contact",
  "screening",
  "interview",
  "technical",
  "final",
  "offer",
  "rejection",
  "other",
  "unknown",
] as const;
export type InboundResponseKind = (typeof INBOUND_RESPONSE_KINDS)[number];

export const INBOUND_RESPONSE_KIND_LABELS_PT: Record<InboundResponseKind, string> = {
  application_acknowledged: "confirmação de candidatura",
  recruiter_contact: "contacto do recrutador",
  screening: "possível screening",
  interview: "possível entrevista",
  technical: "possível etapa técnica",
  final: "possível entrevista final",
  offer: "possível oferta",
  rejection: "possível rejeição",
  other: "outra resposta",
  unknown: "resposta não classificada",
};

export const INBOUND_DETECTION_STATES = ["pending_review", "confirmed", "dismissed"] as const;
export type InboundDetectionState = (typeof INBOUND_DETECTION_STATES)[number];

export const INBOUND_MATCH_STATUSES = ["matched", "ambiguous", "unmatched"] as const;
export type InboundMatchStatus = (typeof INBOUND_MATCH_STATUSES)[number];

export const INBOUND_RESPONSE_AUTO_APPLY = false as const;

export const INBOUND_DISCARD_REASONS = [
  "missing_sender",
  "job_alert",
  "irrelevant_unmatched",
  "incomplete_metadata",
] as const;
export type InboundDiscardReason = (typeof INBOUND_DISCARD_REASONS)[number];

export type InboundResponseAnalysis = {
  analyzedCount: number;
  detections: ResponseDetection[];
  discarded: Array<{ emailId: string; reason: InboundDiscardReason }>;
};

export type InboundResponseAnalysisDecisionOutcome = "created" | "reused" | "discarded";

export type InboundResponseAnalysisDecision = {
  emailId: string;
  outcome: InboundResponseAnalysisDecisionOutcome;
  reason?: InboundDiscardReason;
  matchStatus?: InboundMatchStatus;
  classification?: InboundResponseKind;
};

export type InboundResponseAnalysisSummary = {
  analyzedCount: number;
  detectionsEligible: number;
  detectionsCreated: number;
  detectionsReused: number;
  discardedCount: number;
  discardedByReason: Partial<Record<InboundDiscardReason, number>>;
};

export type InboundResponseAnalysisPreview = {
  source: "synthetic" | "local_sanitized";
  persisted: false;
  summary: InboundResponseAnalysisSummary;
  decisions: InboundResponseAnalysisDecision[];
};

const PUBLIC_MAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "yahoo.com",
  "icloud.com",
  "me.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
]);

const ATS_DOMAINS = new Set([
  "getonbrd.com",
  "getonboard.com",
  "lever.co",
  "greenhouse.io",
  "myworkday.com",
  "smartrecruiters.com",
  "ashbyhq.com",
  "workable.com",
  "bamboohr.com",
  "recruitee.com",
  "jobvite.com",
  "icims.com",
  "indeed.com",
  "linkedin.com",
]);

const GENERIC_TITLE_TOKENS = new Set([
  "engineer",
  "developer",
  "software",
  "remote",
  "senior",
  "junior",
  "staff",
  "intern",
  "internship",
  "frontend",
  "backend",
  "fullstack",
  "full",
  "stack",
  "product",
  "react",
  "node",
  "javascript",
  "typescript",
  "latin",
  "america",
  "foco",
  "engenheiro",
  "desenvolvedor",
  "remoto",
  "pleno",
]);

const JOB_ALERT_PATTERN =
  /\b(job alert|jobalert|jobs? you may like|recommended jobs?|new jobs?( for you)?|daily jobs?|top jobs|jobs for you|vagas (recomendadas|para si|para voc[eê])|alertas? de vagas?)\b/i;

const COMPANY_STOPWORDS = new Set([
  "inc",
  "ltd",
  "llc",
  "sa",
  "gmbh",
  "company",
  "corp",
  "group",
  "labs",
  "consulting",
  "consultoria",
  "technologies",
  "technology",
  "software",
  "studio",
  "the",
  "and",
  "de",
  "do",
  "da",
]);

const CLASSIFICATION_RULES: Array<{
  pattern: RegExp;
  kind: InboundResponseKind;
  confidence: Confidence;
  evidence: string;
}> = [
  {
    pattern: /\b(rejected|infelizmente|n[aã]o avan[cç]aremos|not moving forward|unfortunately|seguir com outros candidatos)\b/i,
    kind: "rejection",
    confidence: "high",
    evidence: "texto contém expressão explícita de rejeição",
  },
  {
    pattern: /\b(offer|proposta|job offer)\b/i,
    kind: "offer",
    confidence: "high",
    evidence: "texto contém expressão explícita de oferta",
  },
  {
    pattern: /\b(final interview|[uú]ltima etapa|last round|final round)\b/i,
    kind: "final",
    confidence: "high",
    evidence: "texto refere entrevista final",
  },
  {
    pattern: /\b(technical|t[eé]cnico|desafio|take[- ]home|assignment)\b/i,
    kind: "technical",
    confidence: "high",
    evidence: "texto refere etapa técnica ou take-home",
  },
  {
    pattern: /\b(interview|entrevista)\b/i,
    kind: "interview",
    confidence: "high",
    evidence: "texto contém convite ou menção explícita a entrevista",
  },
  {
    pattern: /\b(schedule|agendar|marcar uma conversa|30 minutes|30 minutos|calendly|availability)\b/i,
    kind: "screening",
    confidence: "medium",
    evidence: "mensagem solicita agendamento",
  },
  {
    pattern: /\b(screening|triagem)\b/i,
    kind: "screening",
    confidence: "medium",
    evidence: "texto refere screening/triagem",
  },
  {
    pattern:
      /\b(recebemos (a )?sua candidatura|obrigad[oa] por se candidat|thank you for applying|application received|we received your application|candidatura recebida)\b/i,
    kind: "application_acknowledged",
    confidence: "high",
    evidence: "texto confirma receção da candidatura, sem convite de entrevista",
  },
];

export type InboundEmail = {
  id: string;
  threadId?: string;
  from?: string;
  senderDomain?: string;
  to?: string[];
  subject?: string;
  snippet?: string;
  text?: string;
  receivedAt: string;
  accountScope?: string;
  legacyId?: string;
};

export type InboundResponseMatchBasis = "company_domain" | "job_url_host" | "company_token" | "ats_domain" | "title_token";

export type InboundResponseSignalInput = {
  id: string;
  occurredAt: string;
  senderDomain?: string;
  company?: string;
  kind?: string;
  confidence?: number;
  confidenceLevel?: Confidence;
  reason?: string;
  subjectHint?: string;
  snippetHint?: string;
};

export type ResponseDetection = {
  id: string;
  emailId: string;
  applicationId?: string;
  alternateApplicationIds?: string[];
  companyName?: string;
  jobTitle?: string;
  headline: string;
  matchStatus: InboundMatchStatus;
  matchConfidence: Confidence;
  matchEvidence: string[];
  classification: InboundResponseKind;
  classificationConfidence: Confidence;
  classificationEvidence: string[];
  suggestedStatus: ApplyFlowPipelineStatusV2 | null;
  fromStatus?: ApplyFlowPipelineStatusV2;
  pipelineChange: boolean;
  state: InboundDetectionState;
  detectedAt: string;
  receivedAt: string;
  senderDomain: string;
  confirmedEventId?: string;
  autoApply: false;
  reviewRequired: true;
};

/** @deprecated Use ResponseDetection. Kept for proposal-shaped UI mapping. */
export type InboundStatusTransitionProposal = {
  id: string;
  applicationId: string;
  companyName: string;
  jobTitle?: string;
  headline: string;
  kind: InboundResponseKind;
  suggestedStatus: ApplyFlowPipelineStatusV2;
  fromStatus: ApplyFlowPipelineStatusV2;
  confidence: Confidence;
  evidence: {
    senderDomain: string;
    occurredAt: string;
    matchBasis: InboundResponseMatchBasis;
    signalKind?: string;
    keywordRule?: string;
  };
  reason: string;
  pipelineChange: boolean;
  autoApply: false;
  reviewRequired: true;
};

export type InboundResponseEvidence = InboundStatusTransitionProposal["evidence"];

export type MatchableInboundApplication = Pick<
  ApplyFlowApplication,
  "id" | "companyName" | "jobTitle" | "jobUrl" | "status"
>;

export function normalizeInboundDomain(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return undefined;
  const withoutScheme = trimmed.replace(/^mailto:/, "");
  const host = withoutScheme.includes("@")
    ? withoutScheme.slice(withoutScheme.lastIndexOf("@") + 1)
    : withoutScheme.replace(/^https?:\/\//, "").split("/")[0] ?? "";
  const cleaned = host.replace(/^www\./, "").replace(/\.$/, "");
  return cleaned || undefined;
}

export function hostnameFromJobUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url.includes("://") ? url : `https://${url}`);
    return normalizeInboundDomain(parsed.hostname);
  } catch {
    return normalizeInboundDomain(url);
  }
}

export function isPublicMailDomain(domain: string | undefined): boolean {
  const normalized = normalizeInboundDomain(domain);
  return Boolean(normalized && PUBLIC_MAIL_DOMAINS.has(normalized));
}

export function isAtsDomain(domain: string | undefined): boolean {
  const normalized = normalizeInboundDomain(domain);
  if (!normalized) return false;
  if (ATS_DOMAINS.has(normalized)) return true;
  return [...ATS_DOMAINS].some((ats) => normalized === ats || normalized.endsWith(`.${ats}`));
}

export function atsRootDomain(domain: string | undefined): string | undefined {
  const normalized = normalizeInboundDomain(domain);
  if (!normalized) return undefined;
  return [...ATS_DOMAINS].find((ats) => normalized === ats || normalized.endsWith(`.${ats}`));
}

export function isSharedRecruitingHost(domain: string | undefined): boolean {
  return isAtsDomain(domain);
}

function hostsAreRelated(jobHost: string, senderDomain: string): boolean {
  return jobHost === senderDomain || senderDomain.endsWith(`.${jobHost}`) || jobHost.endsWith(`.${senderDomain}`);
}

export function inboundEmailHasText(
  email: Pick<InboundEmail, "subject" | "snippet" | "text">,
): boolean {
  return Boolean(email.subject?.trim() || email.snippet?.trim() || email.text?.trim());
}

export function isJobAlertDomain(domain: string | undefined): boolean {
  const normalized = normalizeInboundDomain(domain);
  if (!normalized) return false;
  const label = domainLabel(normalized);
  return label === "jobalert" || label.includes("jobalert") || label.includes("job-alert");
}

export function isJobAlertInbound(input: {
  senderDomain?: string;
  subjectHint?: string;
  snippetHint?: string;
  text?: string;
}): boolean {
  if (isJobAlertDomain(input.senderDomain)) return true;
  const haystack = [input.subjectHint, input.snippetHint, input.text].filter(Boolean).join(" \n ");
  return Boolean(haystack.trim() && JOB_ALERT_PATTERN.test(haystack));
}

export function companyMatchTokens(companyName: string | undefined): string[] {
  if (!companyName) return [];
  return companyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length >= 4 && !COMPANY_STOPWORDS.has(token));
}

function domainLabel(domain: string): string {
  return domain.split(".")[0] ?? domain;
}

export function domainMatchesCompany(domain: string, companyName: string | undefined): boolean {
  const normalized = normalizeInboundDomain(domain);
  if (!normalized || isPublicMailDomain(normalized) || !companyName) return false;
  const compactCompany = companyName.toLowerCase().replace(/[^a-z0-9]/g, "");
  const label = domainLabel(normalized).replace(/[^a-z0-9]/g, "");
  if (compactCompany.length >= 4 && (label.includes(compactCompany) || compactCompany.includes(label))) {
    return true;
  }
  return companyMatchTokens(companyName).some((token) => normalized.includes(token) || label.includes(token));
}

export function suggestedStatusForInboundKind(kind: InboundResponseKind): ApplyFlowPipelineStatusV2 | null {
  if (kind === "application_acknowledged") return null;
  if (kind === "recruiter_contact") return "recruiter_contacted";
  if (kind === "screening") return "screening";
  if (kind === "interview") return "screening";
  if (kind === "technical") return "technical";
  if (kind === "final") return "final";
  if (kind === "offer") return "offer";
  if (kind === "rejection") return "rejected";
  return null;
}

export function classifyInboundResponse(input: {
  senderDomain?: string;
  signalKind?: string;
  subjectHint?: string;
  snippetHint?: string;
  text?: string;
}): { kind: InboundResponseKind; confidence: Confidence; evidence: string[] } {
  const haystack = [input.subjectHint, input.snippetHint, input.text].filter(Boolean).join(" \n ");
  if (haystack.trim()) {
    for (const rule of CLASSIFICATION_RULES) {
      if (rule.pattern.test(haystack)) {
        return { kind: rule.kind, confidence: rule.confidence, evidence: [rule.evidence] };
      }
    }
  }

  if (input.signalKind === "provider_activity_cluster" || input.signalKind === "interview_likely") {
    return {
      kind: "interview",
      confidence: "medium",
      evidence: ["sinal derivado de calendário/cluster, sem confirmação humana"],
    };
  }
  if (input.signalKind === "rejection_likely") {
    return { kind: "rejection", confidence: "medium", evidence: ["sinal derivado de rejeição"] };
  }
  if (input.signalKind === "offer_likely") {
    return { kind: "offer", confidence: "medium", evidence: ["sinal derivado de oferta"] };
  }
  if (
    isJobAlertInbound({
      senderDomain: input.senderDomain,
      subjectHint: input.subjectHint,
      snippetHint: input.snippetHint,
      text: input.text,
    })
  ) {
    return {
      kind: "other",
      confidence: "high",
      evidence: ["mensagem parece alerta ou recomendação de vagas"],
    };
  }
  if (input.senderDomain && !isPublicMailDomain(input.senderDomain)) {
    return {
      kind: "recruiter_contact",
      confidence: "low",
      evidence: ["remetente corporativo sem padrão textual explícito"],
    };
  }
  return { kind: "unknown", confidence: "low", evidence: ["sem evidência textual suficiente"] };
}

export function inboundResponseHeadline(companyName: string, kind: InboundResponseKind): string {
  const label = INBOUND_RESPONSE_KIND_LABELS_PT[kind];
  if (kind === "application_acknowledged") {
    return `${companyName} confirmou a candidatura`;
  }
  if (kind === "unknown" || kind === "other") {
    return `${companyName} enviou uma mensagem`;
  }
  return `${companyName} respondeu → ${label}`;
}

export function formatInboundConfirmationNotes(detection: Pick<
  ResponseDetection,
  "headline" | "senderDomain" | "classificationConfidence" | "pipelineChange" | "fromStatus" | "suggestedStatus"
>): string {
  const change =
    detection.pipelineChange && detection.fromStatus && detection.suggestedStatus
      ? `${APPLYFLOW_PIPELINE_STATUS_V2_LABELS_PT[detection.fromStatus]} → ${APPLYFLOW_PIPELINE_STATUS_V2_LABELS_PT[detection.suggestedStatus]}`
      : "sem alteração de estágio";
  return `Confirmado: ${detection.headline}. Evidência: domínio ${detection.senderDomain}; confiança ${detection.classificationConfidence}; ${change}. Sem envio de e-mail.`;
}

type ScoredMatch = {
  application: MatchableInboundApplication;
  basis: InboundResponseMatchBasis;
  score: number;
  evidence: string[];
};

function textBlob(email: Pick<InboundEmail, "subject" | "snippet" | "text">): string {
  return [email.subject, email.snippet, email.text].filter(Boolean).join(" ").toLowerCase();
}

function scoreApplicationMatch(
  application: MatchableInboundApplication,
  senderDomain: string,
  email: Pick<InboundEmail, "subject" | "snippet" | "text">,
): ScoredMatch | null {
  const evidence: string[] = [];
  let score = 0;
  let basis: InboundResponseMatchBasis | null = null;
  const jobHost = hostnameFromJobUrl(application.jobUrl);
  if (jobHost && hostsAreRelated(jobHost, senderDomain) && !isSharedRecruitingHost(jobHost) && !isSharedRecruitingHost(senderDomain)) {
    score += 90;
    basis = "job_url_host";
    evidence.push(`domínio próprio da empresa corresponde a ${senderDomain}`);
  }
  if (domainMatchesCompany(senderDomain, application.companyName)) {
    score += 80;
    basis = basis ?? "company_token";
    evidence.push(`domínio do remetente relacionado a ${application.companyName}`);
  }
  const blob = textBlob(email);
  const companyTokens = companyMatchTokens(application.companyName);
  if (companyTokens.some((token) => blob.includes(token))) {
    score += 20;
    evidence.push("nome da empresa aparece no assunto ou snippet");
  }
  const titleTokens = (application.jobTitle ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((token) => token.length >= 6 && !GENERIC_TITLE_TOKENS.has(token));
  if (blob && titleTokens.some((token) => blob.includes(token))) {
    score += 15;
    evidence.push("título específico da vaga aparece no assunto ou snippet");
  }
  if (isAtsDomain(senderDomain) && blob && companyTokens.some((token) => blob.includes(token))) {
    score += 45;
    basis = basis ?? "company_token";
    evidence.push("remetente ATS e nome da empresa no texto");
  }
  if (!basis || score < 40) return null;
  return { application, basis, score, evidence };
}

function confidenceFromScore(score: number, ambiguous: boolean): Confidence {
  if (ambiguous) return "low";
  if (score >= 90) return "high";
  if (score >= 70) return "medium";
  return "low";
}

function isPostApplyStatus(status: ApplyFlowPipelineStatusV2): boolean {
  return (
    status === "applied" ||
    status === "applying" ||
    status === "recruiter_contacted" ||
    status === "screening" ||
    status === "technical" ||
    status === "final" ||
    status === "offer"
  );
}

function senderDomainFromEmail(email: InboundEmail | InboundResponseSignalInput): string | undefined {
  const fromField = "from" in email ? email.from : undefined;
  return normalizeInboundDomain(email.senderDomain ?? ("company" in email ? email.company : undefined) ?? fromField);
}

function inboundEmailFromSignal(signal: InboundResponseSignalInput): InboundEmail {
  return {
    id: signal.id,
    senderDomain: senderDomainFromEmail(signal),
    subject: signal.subjectHint,
    snippet: signal.snippetHint,
    receivedAt: signal.occurredAt,
  };
}

export function inboundEmailFromLocalEvidence(input: {
  senderDomain: string;
  occurredAt?: string;
  subject?: string;
  snippet?: string;
  text?: string;
}): InboundEmail | null {
  const senderDomain = normalizeInboundDomain(input.senderDomain);
  if (!senderDomain) return null;
  const receivedAt =
    input.occurredAt && Number.isFinite(Date.parse(input.occurredAt))
      ? new Date(input.occurredAt).toISOString()
      : new Date().toISOString();
  const subject = input.subject?.trim();
  const snippet = input.snippet?.trim();
  const text = input.text?.trim();
  return {
    id: `local-${senderDomain}-${receivedAt}-${stableLocalKey(subject ?? snippet ?? "")}`,
    senderDomain,
    receivedAt,
    ...(subject ? { subject } : {}),
    ...(snippet ? { snippet } : {}),
    ...(text ? { text } : {}),
  };
}

function stableLocalKey(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

const ACTIONABLE_UNMATCHED_KINDS = new Set<InboundResponseKind>([
  "application_acknowledged",
  "recruiter_contact",
  "screening",
  "interview",
  "technical",
  "final",
  "offer",
  "rejection",
]);

function classificationHasTextEvidence(evidence: readonly string[]): boolean {
  return evidence.some((item) => item.startsWith("texto ") || item.startsWith("mensagem solicita"));
}

function discardReasonForDetection(input: {
  email: InboundEmail;
  matchStatus: InboundMatchStatus;
  classification: InboundResponseKind;
  classificationEvidence: readonly string[];
}): InboundDiscardReason | null {
  if (
    isJobAlertInbound({
      senderDomain: senderDomainFromEmail(input.email),
      subjectHint: input.email.subject,
      snippetHint: input.email.snippet,
      text: input.email.text,
    })
  ) {
    return "job_alert";
  }
  if (input.matchStatus === "matched" || input.matchStatus === "ambiguous") {
    return null;
  }
  if (!inboundEmailHasText(input.email)) {
    return "incomplete_metadata";
  }
  if (ACTIONABLE_UNMATCHED_KINDS.has(input.classification) && classificationHasTextEvidence(input.classificationEvidence)) {
    return null;
  }
  return "irrelevant_unmatched";
}

export function matchInboundEmailToApplications(input: {
  email: InboundEmail;
  applications: readonly MatchableInboundApplication[];
  outcomes?: readonly ApplicationOutcome[];
}): { matches: ScoredMatch[]; status: InboundMatchStatus } {
  const senderDomain = senderDomainFromEmail(input.email);
  if (!senderDomain || isPublicMailDomain(senderDomain)) {
    return { matches: [], status: "unmatched" };
  }
  if (
    isJobAlertInbound({
      senderDomain,
      subjectHint: input.email.subject,
      snippetHint: input.email.snippet,
      text: input.email.text,
    })
  ) {
    return { matches: [], status: "unmatched" };
  }

  const matches: ScoredMatch[] = [];
  for (const application of input.applications) {
    const outcome = input.outcomes?.find((item) => item.applicationId === application.id);
    const status = resolvePipelineStatus({ application, outcome });
    if (!isPostApplyStatus(status)) continue;
    const scored = scoreApplicationMatch(application, senderDomain, input.email);
    if (scored) matches.push(scored);
  }
  matches.sort((left, right) => right.score - left.score || left.application.id.localeCompare(right.application.id));
  const top = matches[0];
  const second = matches[1];
  if (!top) return { matches: [], status: "unmatched" };
  if (second && second.score >= 55 && top.score - second.score < 20) {
    return { matches: matches.slice(0, 3), status: "ambiguous" };
  }
  return { matches: [top], status: "matched" };
}

export function analyzeInboundResponses(input: {
  emails: readonly InboundEmail[];
  applications: readonly MatchableInboundApplication[];
  outcomes?: readonly ApplicationOutcome[];
  existing?: readonly ResponseDetection[];
  now?: Date;
}): InboundResponseAnalysis {
  const now = (input.now ?? new Date()).toISOString();
  const existingByEmailId = new Map((input.existing ?? []).map((item) => [item.emailId, item]));
  const detections: ResponseDetection[] = [];
  const discarded: InboundResponseAnalysis["discarded"] = [];

  for (const email of input.emails) {
    const existing = existingByEmailId.get(email.id);
    if (existing) {
      detections.push(existing);
      continue;
    }

    const senderDomain = senderDomainFromEmail(email);
    if (!senderDomain) {
      discarded.push({ emailId: email.id, reason: "missing_sender" });
      continue;
    }

    const { matches, status } = matchInboundEmailToApplications({
      email,
      applications: input.applications,
      outcomes: input.outcomes,
    });
    const classified = classifyInboundResponse({
      senderDomain,
      subjectHint: email.subject,
      snippetHint: email.snippet,
      text: email.text,
    });
    const discardReason = discardReasonForDetection({
      email,
      matchStatus: status,
      classification: classified.kind,
      classificationEvidence: classified.evidence,
    });
    if (discardReason) {
      discarded.push({ emailId: email.id, reason: discardReason });
      continue;
    }

    const primary = status === "matched" ? matches[0] : undefined;
    const outcome = primary
      ? input.outcomes?.find((item) => item.applicationId === primary.application.id)
      : undefined;
    const fromStatus = primary
      ? resolvePipelineStatus({ application: primary.application, outcome })
      : undefined;
    const suggestedStatus = suggestedStatusForInboundKind(classified.kind);
    const pipelineChange = Boolean(
      fromStatus && suggestedStatus && fromStatus !== suggestedStatus && canTransitionApplicationStatus(fromStatus, suggestedStatus),
    );
    const companyName = primary?.application.companyName?.trim() || senderDomain;
    const matchConfidence = confidenceFromScore(primary?.score ?? 0, status !== "matched");

    detections.push({
      id: `detect-${email.id}`,
      emailId: email.id,
      ...(primary && status === "matched" ? { applicationId: primary.application.id } : {}),
      ...(status === "ambiguous" ? { alternateApplicationIds: matches.map((item) => item.application.id) } : {}),
      companyName,
      ...(primary?.application.jobTitle ? { jobTitle: primary.application.jobTitle } : {}),
      headline: inboundResponseHeadline(companyName, classified.kind),
      matchStatus: status,
      matchConfidence,
      matchEvidence:
        status === "unmatched"
          ? ["nenhuma candidatura aplicada corresponde ao remetente com evidência suficiente"]
          : matches.flatMap((item) => item.evidence),
      classification: classified.kind,
      classificationConfidence: classified.confidence,
      classificationEvidence: classified.evidence,
      suggestedStatus,
      fromStatus,
      pipelineChange,
      state: "pending_review",
      detectedAt: now,
      receivedAt: email.receivedAt,
      senderDomain,
      autoApply: INBOUND_RESPONSE_AUTO_APPLY,
      reviewRequired: true,
    });
  }

  return {
    analyzedCount: input.emails.length,
    detections: detections.sort((left, right) => left.receivedAt.localeCompare(right.receivedAt)),
    discarded,
  };
}

export function detectInboundResponses(input: {
  emails: readonly InboundEmail[];
  applications: readonly MatchableInboundApplication[];
  outcomes?: readonly ApplicationOutcome[];
  existing?: readonly ResponseDetection[];
  now?: Date;
}): ResponseDetection[] {
  return analyzeInboundResponses(input).detections;
}

export function summarizeInboundResponseAnalysis(
  analysis: InboundResponseAnalysis,
  existing: readonly ResponseDetection[] = [],
): InboundResponseAnalysisSummary {
  const existingIds = new Set(existing.map((item) => item.emailId));
  const detectionsReused = analysis.detections.filter((item) => existingIds.has(item.emailId)).length;
  const discardedByReason: Partial<Record<InboundDiscardReason, number>> = {};
  for (const item of analysis.discarded) {
    discardedByReason[item.reason] = (discardedByReason[item.reason] ?? 0) + 1;
  }
  return {
    analyzedCount: analysis.analyzedCount,
    detectionsEligible: analysis.detections.length,
    detectionsCreated: analysis.detections.length - detectionsReused,
    detectionsReused,
    discardedCount: analysis.discarded.length,
    discardedByReason,
  };
}

export function previewInboundResponseAnalysis(
  input: Parameters<typeof analyzeInboundResponses>[0] & { source?: InboundResponseAnalysisPreview["source"] },
): InboundResponseAnalysisPreview {
  const analysis = analyzeInboundResponses(input);
  const existingIds = new Set((input.existing ?? []).map((item) => item.emailId));
  const discardedById = new Map(analysis.discarded.map((item) => [item.emailId, item.reason]));
  const detectionsByEmailId = new Map(analysis.detections.map((item) => [item.emailId, item]));
  const decisions: InboundResponseAnalysisDecision[] = input.emails.map((email) => {
    const discardReason = discardedById.get(email.id);
    if (discardReason) {
      return { emailId: email.id, outcome: "discarded", reason: discardReason };
    }
    const detection = detectionsByEmailId.get(email.id);
    return {
      emailId: email.id,
      outcome: existingIds.has(email.id) ? "reused" : "created",
      ...(detection?.matchStatus ? { matchStatus: detection.matchStatus } : {}),
      ...(detection?.classification ? { classification: detection.classification } : {}),
    };
  });
  return {
    source: input.source ?? "synthetic",
    persisted: false,
    summary: summarizeInboundResponseAnalysis(analysis, input.existing),
    decisions,
  };
}

export function mergeInboundResponseDetections(
  existing: readonly ResponseDetection[],
  incoming: readonly ResponseDetection[],
): ResponseDetection[] {
  const byEmailId = new Map(existing.map((item) => [item.emailId, item]));
  for (const item of incoming) {
    const previous = byEmailId.get(item.emailId);
    if (!previous) {
      byEmailId.set(item.emailId, item);
      continue;
    }
    if (previous.state === "pending_review" && (item.state === "confirmed" || item.state === "dismissed")) {
      byEmailId.set(item.emailId, item);
      continue;
    }
  }
  return [...byEmailId.values()].sort((left, right) => left.receivedAt.localeCompare(right.receivedAt));
}

export function prepareResponseDetectionConfirmation(input: {
  detection: ResponseDetection;
  applications: readonly MatchableInboundApplication[];
  outcomes?: readonly ApplicationOutcome[];
  selectedApplicationId?: string;
  selectedStatus?: ApplyFlowPipelineStatusV2 | null;
}):
  | {
      ok: true;
      applicationId: string;
      fromStatus: ApplyFlowPipelineStatusV2;
      toStatus: ApplyFlowPipelineStatusV2 | null;
      pipelineChange: boolean;
    }
  | { ok: false; error: "ambiguous" | "unmatched" | "invalid_transition" | "missing_application"; message: string } {
  if (input.detection.autoApply) {
    return { ok: false, error: "invalid_transition", message: "Detecção recusou apply automático." };
  }
  const applicationId = input.selectedApplicationId ?? input.detection.applicationId;
  if (input.detection.matchStatus === "ambiguous" && !input.selectedApplicationId && !input.detection.applicationId) {
    return { ok: false, error: "ambiguous", message: "Há mais de uma candidatura possível. Escolhe a vaga certa." };
  }
  if (input.detection.matchStatus === "unmatched" && !input.selectedApplicationId) {
    return { ok: false, error: "unmatched", message: "Esta mensagem não está associada a uma candidatura." };
  }
  if (!applicationId) {
    return { ok: false, error: "missing_application", message: "Escolhe a candidatura antes de confirmar." };
  }
  const application = input.applications.find((item) => item.id === applicationId);
  if (!application) {
    return { ok: false, error: "missing_application", message: "A candidatura já não está neste browser." };
  }
  const outcome = input.outcomes?.find((item) => item.applicationId === application.id);
  const fromStatus = resolvePipelineStatus({ application, outcome });
  const toStatus =
    input.selectedStatus === undefined ? input.detection.suggestedStatus : input.selectedStatus;
  if (toStatus && toStatus !== fromStatus && !canTransitionApplicationStatus(fromStatus, toStatus)) {
    return {
      ok: false,
      error: "invalid_transition",
      message: `Transição ${fromStatus} → ${toStatus} não é permitida.`,
    };
  }
  return {
    ok: true,
    applicationId,
    fromStatus,
    toStatus,
    pipelineChange: Boolean(toStatus && toStatus !== fromStatus),
  };
}

export function markResponseDetectionConfirmed(
  detection: ResponseDetection,
  eventId: string | undefined,
): ResponseDetection {
  return {
    ...detection,
    state: "confirmed",
    ...(eventId ? { confirmedEventId: eventId } : {}),
  };
}

export function markResponseDetectionDismissed(detection: ResponseDetection): ResponseDetection {
  return { ...detection, state: "dismissed", pipelineChange: false };
}

export function matchInboundSignalToApplications(input: {
  signal: InboundResponseSignalInput;
  applications: readonly MatchableInboundApplication[];
  outcomes?: readonly ApplicationOutcome[];
}): Array<{ application: MatchableInboundApplication; basis: InboundResponseMatchBasis; score: number }> {
  return matchInboundEmailToApplications({
    email: inboundEmailFromSignal(input.signal),
    applications: input.applications,
    outcomes: input.outcomes,
  }).matches;
}

export function buildInboundStatusTransitionProposals(input: {
  signals: readonly InboundResponseSignalInput[];
  applications: readonly MatchableInboundApplication[];
  outcomes?: readonly ApplicationOutcome[];
}): InboundStatusTransitionProposal[] {
  const emails = input.signals
    .filter((signal) => signal.kind !== "provider_follow_up_window")
    .map(inboundEmailFromSignal);
  return detectInboundResponses({
    emails,
    applications: input.applications,
    outcomes: input.outcomes,
  })
    .filter((item) => item.matchStatus === "matched" && item.applicationId && item.fromStatus && item.suggestedStatus)
    .filter((item) => !item.pipelineChange || canTransitionApplicationStatus(item.fromStatus!, item.suggestedStatus!))
    .map((item) => ({
      id: item.id,
      applicationId: item.applicationId!,
      companyName: item.companyName ?? item.senderDomain,
      ...(item.jobTitle ? { jobTitle: item.jobTitle } : {}),
      headline: item.headline,
      kind: item.classification,
      suggestedStatus: item.suggestedStatus!,
      fromStatus: item.fromStatus!,
      confidence: item.classificationConfidence,
      evidence: {
        senderDomain: item.senderDomain,
        occurredAt: item.receivedAt,
        matchBasis: "company_token",
      },
      reason: [...item.matchEvidence, ...item.classificationEvidence, "Nada entra no pipeline sem a tua confirmação."].join(
        " ",
      ),
      pipelineChange: item.pipelineChange,
      autoApply: INBOUND_RESPONSE_AUTO_APPLY,
      reviewRequired: true as const,
    }));
}

export function inboundSignalFromLocalEvidence(input: {
  senderDomain: string;
  occurredAt?: string;
  subjectHint?: string;
}): InboundResponseSignalInput | null {
  const email = inboundEmailFromLocalEvidence({
    senderDomain: input.senderDomain,
    occurredAt: input.occurredAt,
    subject: input.subjectHint,
  });
  if (!email?.senderDomain) return null;
  return {
    id: email.id,
    occurredAt: email.receivedAt,
    senderDomain: email.senderDomain,
    kind: "provider_email_activity",
    confidenceLevel: input.subjectHint ? "high" : "medium",
    ...(email.subject ? { subjectHint: email.subject } : {}),
  };
}

export function applicationStatusForMatching(application: MatchableInboundApplication): ApplyFlowPipelineStatusV2 {
  return toPipelineStatusV2(application.status);
}
