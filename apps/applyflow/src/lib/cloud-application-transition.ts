import {
  applyPipelineStatusToLinkedJob,
  canTransitionApplicationStatus,
  fromPipelineStatusV2,
  resolvePipelineStatus,
  type ApplyFlowApplicationV2Envelope,
  type ApplyFlowJob,
  type ApplyFlowPipelineStatusV2,
} from "@devflow/applyflow-core";

import type {
  ApplyFlowDashboardPersistence,
  DashboardPersistenceFailureCode,
  DashboardPersistenceResult,
} from "@/lib/persistence-v2/dashboard/dashboard-persistence";

export type CloudApplicationLifecycleSuccess = {
  ok: true;
  application: ApplyFlowApplicationV2Envelope;
  job: ApplyFlowJob | null;
  jobSynced: boolean;
};

export type CloudApplicationLifecycleFailure = {
  ok: false;
  reason: "invalid_transition" | "application_update_failed" | "job_sync_incomplete";
  code?: DashboardPersistenceFailureCode;
  fromStatus: ApplyFlowPipelineStatusV2;
  toStatus: ApplyFlowPipelineStatusV2;
  /** Present when Application persisted but Job sync failed. */
  application?: ApplyFlowApplicationV2Envelope;
  job?: ApplyFlowJob | null;
};

export type CloudApplicationLifecycleResult = CloudApplicationLifecycleSuccess | CloudApplicationLifecycleFailure;

export type CloudApplicationLifecycleInput = {
  persistence: ApplyFlowDashboardPersistence;
  application: ApplyFlowApplicationV2Envelope;
  toStatus: ApplyFlowPipelineStatusV2;
  /** Linked job when known (sourceJobId). Do not fuzzy-match. */
  linkedJob?: ApplyFlowJob | null;
  notes?: string;
  now?: Date;
};

/**
 * Cloud/V2 Application lifecycle transition with domain parity to local:
 * validate → persist Application → sync linked Job via sourceJobId.
 *
 * Does not fabricate career events. Partial Job sync failure is reported honestly.
 */
export async function transitionCloudApplicationLifecycle(
  input: CloudApplicationLifecycleInput,
): Promise<CloudApplicationLifecycleResult> {
  const now = input.now ?? new Date();
  const fromStatus = resolvePipelineStatus({ application: input.application });
  const toStatus = input.toStatus;

  if (!canTransitionApplicationStatus(fromStatus, toStatus)) {
    return {
      ok: false,
      reason: "invalid_transition",
      code: "invalid_status_transition",
      fromStatus,
      toStatus,
    };
  }

  if (fromStatus === toStatus) {
    return {
      ok: true,
      application: input.application,
      job: input.linkedJob ?? null,
      jobSynced: false,
    };
  }

  const nextV1 = fromPipelineStatusV2(toStatus);
  const appResult: DashboardPersistenceResult<ApplyFlowApplicationV2Envelope> =
    await input.persistence.updateApplication({
      ...input.application,
      status: nextV1,
      ...(input.notes ? { notes: input.notes } : {}),
    });

  if (!appResult.ok) {
    return {
      ok: false,
      reason: "application_update_failed",
      code: appResult.code,
      fromStatus,
      toStatus,
    };
  }

  const sourceJobId = appResult.data.v2?.sourceJobId;
  if (!sourceJobId) {
    return {
      ok: true,
      application: appResult.data,
      job: null,
      jobSynced: false,
    };
  }

  const linked =
    input.linkedJob && input.linkedJob.id === sourceJobId
      ? input.linkedJob
      : null;

  if (!linked) {
    // Application transition is valid; no guessing identity for Job sync.
    return {
      ok: true,
      application: appResult.data,
      job: null,
      jobSynced: false,
    };
  }

  const nextJob = applyPipelineStatusToLinkedJob(linked, toStatus, now);
  if (nextJob === linked || nextJob.status === linked.status) {
    return {
      ok: true,
      application: appResult.data,
      job: linked,
      jobSynced: false,
    };
  }

  const jobResult = await input.persistence.updateJob(nextJob);
  if (!jobResult.ok) {
    return {
      ok: false,
      reason: "job_sync_incomplete",
      code: jobResult.code,
      fromStatus,
      toStatus,
      application: appResult.data,
      job: linked,
    };
  }

  return {
    ok: true,
    application: appResult.data,
    job: jobResult.data,
    jobSynced: true,
  };
}

export function cloudLifecycleFailureMessage(result: CloudApplicationLifecycleFailure): string {
  if (result.reason === "invalid_transition") {
    return "Essa mudança de estágio não é permitida.";
  }
  if (result.reason === "job_sync_incomplete") {
    return "Candidatura actualizada, mas a vaga ligada não sincronizou. Recarrega e tenta de novo.";
  }
  if (result.code === "invalid_status_transition") {
    return "Essa mudança de estágio não é permitida.";
  }
  if (result.code === "read_only") {
    return "Esta conta está em modo leitura. Alterações na nuvem estão desativadas.";
  }
  if (result.code === "version_conflict") {
    return "Outra alteração foi gravada antes desta. Recarregue o painel antes de tentar de novo.";
  }
  return "Não foi possível gravar na conta.";
}
