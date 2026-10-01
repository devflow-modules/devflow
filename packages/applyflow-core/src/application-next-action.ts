import type { ApplyFlowApplication, ApplyFlowApplicationStatus } from "./application-types.js";
import type { ApplyFlowJob } from "./job-match-types.js";
import {
  fromPipelineStatusV2,
  isApplyFlowApplicationStatusV1,
  isApplyFlowPipelineStatusV2,
  toPipelineStatusV2,
  type ApplyFlowPipelineStatusV2,
} from "./pipeline-status.js";
import { markApplyFlowJobApplied } from "./application-pack.js";

export type ApplicationNextActionKind =
  | "complete_submission"
  | "consider_follow_up"
  | "track_contact"
  | "prepare_interview"
  | "complete_technical"
  | "prepare_final"
  | "review_offer"
  | "terminal"
  | "none";

export type ApplicationNextActionGuidance = {
  kind: ApplicationNextActionKind;
  label: string;
  detail?: string;
  href?: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Pure derived guidance from canonical V2 status (or V1 mapped through the existing adapter).
 * Not persisted. Does not mutate Application/Job/Contact. No network.
 */
export function resolveCanonicalPipelineStatus(
  status: ApplyFlowPipelineStatusV2 | ApplyFlowApplicationStatus | string,
): ApplyFlowPipelineStatusV2 | null {
  if (isApplyFlowPipelineStatusV2(status)) return status;
  if (isApplyFlowApplicationStatusV1(status)) return toPipelineStatusV2(status);
  return null;
}

export function deriveApplicationNextAction(input: {
  status: ApplyFlowPipelineStatusV2 | ApplyFlowApplicationStatus | string;
  jobId?: string;
}): ApplicationNextActionGuidance {
  const status = resolveCanonicalPipelineStatus(input.status);
  if (!status) {
    return { kind: "none", label: "Sem orientação" };
  }

  const analysisHref = input.jobId ? `/dashboard/jobs/${encodeURIComponent(input.jobId)}` : undefined;
  const labHref = "/dashboard/interview-lab";

  switch (status) {
    case "found":
    case "qualified":
    case "applying":
      return {
        kind: "complete_submission",
        label: "Concluir / registrar envio",
        detail: "Depois de enviares tu ao empregador, usa «Marcar como enviada».",
        ...(analysisHref ? { href: analysisHref } : {}),
      };
    case "applied":
      return {
        kind: "consider_follow_up",
        label: "Considerar follow-up",
        detail: "Orientação apenas — sem evidência de contacto nesta fase.",
        ...(analysisHref ? { href: analysisHref } : {}),
      };
    case "recruiter_contacted":
      return {
        kind: "track_contact",
        label: "Acompanhar contacto",
        detail: "Preparar a próxima etapa com o contacto já registado.",
        ...(analysisHref ? { href: analysisHref } : {}),
      };
    case "screening":
      return {
        kind: "prepare_interview",
        label: "Preparar entrevista",
        detail: "Usa o Interview Lab ou o brief da análise desta vaga.",
        href: labHref,
      };
    case "technical":
      return {
        kind: "complete_technical",
        label: "Completar teste técnico",
        detail: "Sem prazo estruturado nesta fase — acompanha o teu próprio calendário.",
      };
    case "final":
      return {
        kind: "prepare_final",
        label: "Preparar etapa final",
        href: labHref,
      };
    case "offer":
      return {
        kind: "review_offer",
        label: "Revisar proposta",
        detail: "Revisa os termos com calma. Não há fluxo de negociação automático.",
      };
    case "hired":
    case "rejected":
    case "withdrawn":
    case "skipped":
      return {
        kind: "terminal",
        label: "Encerrada",
        detail: "Estado terminal — sem próximo passo activo.",
      };
    default:
      return { kind: "none", label: "Sem orientação" };
  }
}

export type ApplicationAgeKind = "registered" | "updated" | "applied" | "stale_update";

export type ApplicationAgeCopy = {
  kind: ApplicationAgeKind;
  label: string;
  days: number;
};

function daysBetween(isoStamp: string, now: Date): number | null {
  const ms = Date.parse(isoStamp);
  if (!Number.isFinite(ms)) return null;
  const days = Math.floor((now.getTime() - ms) / DAY_MS);
  return days < 0 ? 0 : days;
}

function dayWord(days: number): string {
  return days === 1 ? "dia" : "dias";
}

/** Factual age labels only. Never invents employer non-response. */
export function formatApplicationRegisteredAge(createdAt: string, now: Date = new Date()): ApplicationAgeCopy | null {
  const days = daysBetween(createdAt, now);
  if (days == null) return null;
  return { kind: "registered", days, label: `Registrada há ${days} ${dayWord(days)}` };
}

export function formatApplicationUpdatedAge(updatedAt: string, now: Date = new Date()): ApplicationAgeCopy | null {
  const days = daysBetween(updatedAt, now);
  if (days == null) return null;
  return { kind: "updated", days, label: `Atualizada há ${days} ${dayWord(days)}` };
}

/**
 * Only when a real appliedAt is available (outcome or cloud field).
 * Never pass updatedAt here.
 */
export function formatApplicationAppliedAge(appliedAt: string, now: Date = new Date()): ApplicationAgeCopy | null {
  const days = daysBetween(appliedAt, now);
  if (days == null) return null;
  return { kind: "applied", days, label: `Aplicada há ${days} ${dayWord(days)}` };
}

/** Truthful staleness: lack of mutation, not employer silence. */
export function formatApplicationStaleUpdateAge(updatedAt: string, now: Date = new Date()): ApplicationAgeCopy | null {
  const days = daysBetween(updatedAt, now);
  if (days == null) return null;
  return { kind: "stale_update", days, label: `Sem atualização há ${days} ${dayWord(days)}` };
}

export function collectApplicationAgeCopies(input: {
  createdAt: string;
  updatedAt: string;
  appliedAt?: string | null;
  now?: Date;
}): ApplicationAgeCopy[] {
  const now = input.now ?? new Date();
  const copies: ApplicationAgeCopy[] = [];
  const registered = formatApplicationRegisteredAge(input.createdAt, now);
  if (registered) copies.push(registered);
  if (input.appliedAt) {
    const applied = formatApplicationAppliedAge(input.appliedAt, now);
    if (applied) copies.push(applied);
  }
  const updated = formatApplicationUpdatedAge(input.updatedAt, now);
  if (updated) copies.push(updated);
  return copies;
}

/** Maps Application V2 target → persisted Job V1 status via the canonical adapter. */
export function jobStatusForPipelineTransition(toStatus: ApplyFlowPipelineStatusV2): ApplyFlowApplicationStatus {
  return fromPipelineStatusV2(toStatus);
}

/**
 * Applies mapped lifecycle status to a linked job. Prefer sourceJobId callers;
 * this helper does not search by URL/company.
 */
export function applyPipelineStatusToLinkedJob(
  job: ApplyFlowJob,
  toStatus: ApplyFlowPipelineStatusV2,
  now: Date = new Date(),
): ApplyFlowJob {
  if (toStatus === "applied") {
    return markApplyFlowJobApplied(job, now);
  }
  const nextStatus = jobStatusForPipelineTransition(toStatus);
  if (job.status === nextStatus) return job;
  return {
    ...job,
    status: nextStatus,
    updatedAt: now.toISOString(),
  };
}

export function applicationSourceJobId(
  application: Pick<ApplyFlowApplication, "id"> & { v2?: { sourceJobId?: string } },
): string | undefined {
  return application.v2?.sourceJobId;
}
