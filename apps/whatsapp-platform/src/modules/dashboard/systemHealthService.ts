import { prisma } from "@/lib/prisma";
import { COMMERCIAL_TASK_TYPES } from "@/modules/commercial/commercialAutomationConstants";
import { getOrCreateTenantOperationalConfig } from "@/modules/operations/tenantOperationalConfigService";
import {
  classifyWebhookHealth,
  getWebhookHealthForTenant,
  type WebhookHealthStatus,
} from "@/modules/operations/webhookHealthService";

const HOURS_24_MS = 24 * 60 * 60 * 1000;
const INBOX_RECENT_MS = 48 * 60 * 60 * 1000;

export type SystemHealthSnapshot = {
  channelStatus: {
    displayPhone: string | null;
    phoneConnected: boolean;
    lastInboundAt: string | null;
    lastOutboundAt: string | null;
    /** Sinal secundário (inbox), não substitui telemetria do webhook. */
    inboxActivityRecent: boolean;
  };
  webhookHealth: {
    status: WebhookHealthStatus;
    label: string;
    detail: string;
    lastReceivedAt: string | null;
    lastSuccessAt: string | null;
    lastErrorAt: string | null;
    totalReceived: number;
    totalErrors: number;
  };
  operationalControls: {
    aiEnabled: boolean;
    automationEnabled: boolean;
  };
  automationStatus: {
    /** IA automática pode correr (config + operação). */
    aiActive: boolean;
    aiPausedByAdmin: boolean;
    automationActive: boolean;
    automationPausedByAdmin: boolean;
    /** Texto curto para UI */
    aiLabel: string;
    automationLabel: string;
  };
  taskCounts: {
    followUpPending: number;
    reactivationPending: number;
    recoveryPending: number;
  };
  errorSummary: {
    count24h: number;
    lastThree: Array<{ at: string; message: string; kind: string }>;
  };
  criticalLogs: Array<{ at: string; message: string; tone: "error" | "warning" }>;
};

async function maxMessageTs(
  tenantId: string,
  direction: "INBOUND" | "OUTBOUND"
): Promise<Date | null> {
  const row = await prisma.waInboxMessage.findFirst({
    where: { tenantId, direction },
    orderBy: { ts: "desc" },
    select: { ts: true },
  });
  return row?.ts ?? null;
}

export async function getSystemHealthSnapshot(tenantId: string): Promise<SystemHealthSnapshot> {
  const since = new Date(Date.now() - HOURS_24_MS);
  const nowMs = Date.now();

  const [
    phones,
    aiConfig,
    opCfg,
    whRow,
    lastIn,
    lastOut,
    taskGroups,
    errorCount,
    errorRows,
    logRows,
    failedOut,
  ] = await Promise.all([
    prisma.whatsappPhoneNumber.findMany({
      where: { tenantId },
      select: { displayPhoneNumber: true, status: true, isPrimary: true, isDefaultOutbound: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.aiAgentConfig.findUnique({
      where: { tenantId },
      select: { enabled: true, autoReply: true },
    }),
    getOrCreateTenantOperationalConfig(tenantId),
    getWebhookHealthForTenant(tenantId),
    maxMessageTs(tenantId, "INBOUND"),
    maxMessageTs(tenantId, "OUTBOUND"),
    prisma.followUpTask.groupBy({
      by: ["type"],
      where: { tenantId, executed: false },
      _count: { _all: true },
    }),
    prisma.aiMessageLog.count({
      where: { tenantId, eventKind: "error", createdAt: { gte: since } },
    }),
    prisma.aiMessageLog.findMany({
      where: { tenantId, eventKind: "error", createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: {
        createdAt: true,
        errorMessage: true,
        decisionReason: true,
        eventKind: true,
      },
    }),
    prisma.aiMessageLog.findMany({
      where: {
        tenantId,
        createdAt: { gte: since },
        eventKind: { in: ["error", "blocked", "blocked_by_guard"] },
      },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: {
        createdAt: true,
        eventKind: true,
        errorMessage: true,
        decisionReason: true,
      },
    }),
    prisma.waInboxMessage.findMany({
      where: {
        tenantId,
        direction: "OUTBOUND",
        status: "FAILED",
        ts: { gte: since },
      },
      orderBy: { ts: "desc" },
      take: 5,
      select: { ts: true, errorMessage: true },
    }),
  ]);

  const primary =
    phones.find((p) => p.isPrimary) ?? phones.find((p) => p.isDefaultOutbound) ?? phones[0];
  const phoneConnected = primary?.status === "ACTIVE";

  const lastInboundAt = lastIn?.toISOString() ?? null;
  const lastOutboundAt = lastOut?.toISOString() ?? null;
  const inboundAge = lastIn ? nowMs - lastIn.getTime() : null;
  const inboxActivityRecent =
    phoneConnected && inboundAge !== null && inboundAge < INBOX_RECENT_MS;

  const whDisplay = classifyWebhookHealth(nowMs, whRow);

  const taskMap = Object.fromEntries(taskGroups.map((g) => [g.type, g._count._all])) as Record<
    string,
    number
  >;

  const cfgAi = Boolean(aiConfig?.enabled && aiConfig?.autoReply !== false);
  const aiActive = cfgAi && opCfg.aiEnabled && opCfg.automationEnabled;
  const automationActive = opCfg.automationEnabled;

  const aiLabel = !opCfg.aiEnabled
    ? "IA pausada manualmente"
    : !opCfg.automationEnabled
      ? "IA indisponível (automação pausada)"
      : cfgAi
        ? "IA ativa"
        : "IA desligada nas definições";

  const automationLabel = opCfg.automationEnabled ? "Automação ativa" : "Automação pausada manualmente";

  const lastThree = errorRows.map((r) => ({
    at: r.createdAt.toISOString(),
    kind: "error",
    message: (r.errorMessage ?? r.decisionReason ?? "Erro registado").trim().slice(0, 160),
  }));

  const criticalLogs: SystemHealthSnapshot["criticalLogs"] = [];

  for (const r of logRows) {
    const msg = (r.errorMessage ?? r.decisionReason ?? "").trim();
    if (!msg && r.eventKind !== "blocked" && r.eventKind !== "blocked_by_guard") continue;
    const label =
      r.eventKind === "error"
        ? msg || "Erro na IA"
        : msg || "IA bloqueada pela política de segurança";
    criticalLogs.push({
      at: r.createdAt.toISOString(),
      message: label.slice(0, 180),
      tone: r.eventKind === "error" ? "error" : "warning",
    });
  }

  for (const f of failedOut) {
    criticalLogs.push({
      at: f.ts.toISOString(),
      message: (f.errorMessage ?? "Falha ao enviar mensagem").slice(0, 180),
      tone: "error",
    });
  }

  criticalLogs.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return {
    channelStatus: {
      displayPhone: primary?.displayPhoneNumber ?? null,
      phoneConnected,
      lastInboundAt,
      lastOutboundAt,
      inboxActivityRecent,
    },
    webhookHealth: {
      status: whDisplay.status,
      label: whDisplay.label,
      detail: whDisplay.detail,
      lastReceivedAt: whRow?.lastReceivedAt?.toISOString() ?? null,
      lastSuccessAt: whRow?.lastSuccessAt?.toISOString() ?? null,
      lastErrorAt: whRow?.lastErrorAt?.toISOString() ?? null,
      totalReceived: whRow?.totalReceived ?? 0,
      totalErrors: whRow?.totalErrors ?? 0,
    },
    operationalControls: {
      aiEnabled: opCfg.aiEnabled,
      automationEnabled: opCfg.automationEnabled,
    },
    automationStatus: {
      aiActive,
      aiPausedByAdmin: !opCfg.aiEnabled,
      automationActive,
      automationPausedByAdmin: !opCfg.automationEnabled,
      aiLabel,
      automationLabel,
    },
    taskCounts: {
      followUpPending: taskMap[COMMERCIAL_TASK_TYPES.FOLLOWUP] ?? 0,
      reactivationPending: taskMap[COMMERCIAL_TASK_TYPES.REACTIVATION] ?? 0,
      recoveryPending: taskMap[COMMERCIAL_TASK_TYPES.RECOVERY] ?? 0,
    },
    errorSummary: {
      count24h: errorCount,
      lastThree,
    },
    criticalLogs: criticalLogs.slice(0, 8),
  };
}
