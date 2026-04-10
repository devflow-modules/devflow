import type { SystemHealthSnapshot } from "./systemHealthService";

export type SystemHealthOverall = "ok" | "attention" | "error";

export type SystemHealthSummary = {
  overall: SystemHealthOverall;
  message: string;
};

const STALE_INBOUND_MS = 48 * 60 * 60 * 1000;
const TASK_BACKLOG_WARN = 40;

/**
 * Resume o estado geral para o cartão principal (textos simples para o admin).
 */
export function buildSystemHealthSummary(snapshot: SystemHealthSnapshot): SystemHealthSummary {
  const { channelStatus, webhookHealth, operationalControls, errorSummary, taskCounts } = snapshot;

  if (!channelStatus.phoneConnected) {
    return {
      overall: "error",
      message: "Problema crítico no sistema",
    };
  }

  if (!operationalControls.automationEnabled || !operationalControls.aiEnabled) {
    return {
      overall: "attention",
      message: "Automação ou IA pausada manualmente — verifique os controlos.",
    };
  }

  if (webhookHealth.status === "error") {
    return {
      overall: "error",
      message: "Webhook sem confirmação recente — risco de perder mensagens.",
    };
  }

  const lastIn = channelStatus.lastInboundAt ? new Date(channelStatus.lastInboundAt).getTime() : null;
  const staleInbound =
    lastIn != null && Number.isFinite(lastIn) ? Date.now() - lastIn > STALE_INBOUND_MS : false;

  const backlog =
    taskCounts.followUpPending + taskCounts.reactivationPending + taskCounts.recoveryPending;

  if (errorSummary.count24h >= 8) {
    return {
      overall: "error",
      message: "Problema crítico no sistema",
    };
  }

  if (
    errorSummary.count24h >= 1 ||
    staleInbound ||
    webhookHealth.status === "attention" ||
    backlog >= TASK_BACKLOG_WARN
  ) {
    return {
      overall: "attention",
      message: "Algumas falhas ou atrasos detectados",
    };
  }

  return {
    overall: "ok",
    message: "Operação funcionando normalmente",
  };
}
