import { prisma } from "@/lib/prisma";
import {
  WEBHOOK_ATTENTION_MAX_AGE_MS,
  WEBHOOK_OK_MAX_AGE_MS,
  WEBHOOK_STALE_ERROR_MS,
} from "./webhookHealthConstants";

export type WebhookHealthStatus = "ok" | "attention" | "error";

export type WebhookHealthRow = {
  lastReceivedAt: Date | null;
  lastSuccessAt: Date | null;
  lastErrorAt: Date | null;
  totalReceived: number;
  totalErrors: number;
  updatedAt: Date;
};

/**
 * Webhook processado com sucesso (persistência inbox / pipeline sem falha crítica).
 */
export async function recordWebhookProcessingSuccess(tenantId: string): Promise<void> {
  const now = new Date();
  await prisma.webhookHealth.upsert({
    where: { tenantId },
    create: {
      tenantId,
      lastReceivedAt: now,
      lastSuccessAt: now,
      totalReceived: 1,
    },
    update: {
      lastReceivedAt: now,
      lastSuccessAt: now,
      totalReceived: { increment: 1 },
    },
  });
}

/**
 * Falha relevante ao processar evento (persistência ou pipeline).
 */
export async function recordWebhookProcessingError(tenantId: string): Promise<void> {
  const now = new Date();
  await prisma.webhookHealth.upsert({
    where: { tenantId },
    create: {
      tenantId,
      lastReceivedAt: now,
      lastErrorAt: now,
      totalErrors: 1,
    },
    update: {
      lastReceivedAt: now,
      lastErrorAt: now,
      totalErrors: { increment: 1 },
    },
  });
}

export async function getWebhookHealthForTenant(tenantId: string): Promise<WebhookHealthRow | null> {
  return prisma.webhookHealth.findUnique({
    where: { tenantId },
    select: {
      lastReceivedAt: true,
      lastSuccessAt: true,
      lastErrorAt: true,
      totalReceived: true,
      totalErrors: true,
      updatedAt: true,
    },
  });
}

export type WebhookHealthDisplay = {
  status: WebhookHealthStatus;
  label: string;
  detail: string;
};

/**
 * Classificação pura para UI e resumo de saúde (usa timestamps persistidos).
 */
export function classifyWebhookHealth(nowMs: number, row: WebhookHealthRow | null): WebhookHealthDisplay {
  if (!row?.lastSuccessAt) {
    return {
      status: "error",
      label: "Webhook inativo",
      detail: "Ainda não há confirmação de mensagens recebidas pelo canal.",
    };
  }

  const ageOk = nowMs - row.lastSuccessAt.getTime();
  if (ageOk <= WEBHOOK_OK_MAX_AGE_MS) {
    return {
      status: "ok",
      label: "Webhook ativo",
      detail: "Última recepção com sucesso há pouco.",
    };
  }
  if (ageOk <= WEBHOOK_ATTENTION_MAX_AGE_MS) {
    return {
      status: "attention",
      label: "Webhook com atenção",
      detail: "Último sucesso há algum tempo — verifique tráfego ou Meta.",
    };
  }
  if (ageOk <= WEBHOOK_STALE_ERROR_MS) {
    return {
      status: "attention",
      label: "Webhook instável",
      detail: "Sem eventos recentes confirmados.",
    };
  }

  return {
    status: "error",
    label: "Webhook sem eventos recentes",
    detail: "Há muito tempo sem confirmação de receção.",
  };
}
