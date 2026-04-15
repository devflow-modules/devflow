import { WhatsappPhoneNumberStatus } from "@/generated/prisma-whatsapp";
import { prisma } from "@/lib/prisma";
import {
  classifyChannelError,
  resolveWebhookCallbackUrl,
  type ChannelErrorType,
} from "@/modules/whatsapp/activationPlaybookService";
import { logChannelEvent } from "@/modules/whatsapp/channelEventService";
import { activateWhatsappChannel } from "@/modules/whatsapp/whatsappChannelLifecycle";

export const AUTO_HEAL_MAX_ATTEMPTS = 2;

export const AUTO_HEAL_CONFIG = {
  TOKEN_INVALID: { cooldownMinutes: 5 },
  WEBHOOK_INVALID: { cooldownMinutes: 3 },
} as const;

export type AutoHealStatus = "ACTIVE" | "COOLDOWN" | "DISABLED";

const inFlight = new Set<string>();

export function isAutoHealEnabled(): boolean {
  return process.env.WHATSAPP_AUTO_HEAL_ENABLED !== "0";
}

/** Logs de agendamento/execução (desligar ruído: WHATSAPP_AUTO_HEAL_LOG_SCHEDULE=0). */
export function shouldLogAutoHealSchedule(): boolean {
  return process.env.WHATSAPP_AUTO_HEAL_LOG_SCHEDULE !== "0";
}

function allowedAutoHealErrorType(t: ChannelErrorType): t is "TOKEN_INVALID" | "WEBHOOK_INVALID" {
  return t === "TOKEN_INVALID" || t === "WEBHOOK_INVALID";
}

function cooldownMsFor(errorType: "TOKEN_INVALID" | "WEBHOOK_INVALID"): number {
  return AUTO_HEAL_CONFIG[errorType].cooldownMinutes * 60_000;
}

export type AutoHealEvaluationInput = {
  status: string;
  lastEvent: { type: string; message: string; createdAt?: string } | null;
  autoHealAttempts: number;
  lastAutoHealAt: Date | null;
  /** TOKEN_INVALID sem token na BD não tem auto-heal real. */
  hasStoredAccessToken: boolean;
};

/**
 * Estado de auto-heal para UI e API (não executa nada).
 */
export function computeAutoHealStatus(input: AutoHealEvaluationInput): AutoHealStatus {
  if (!isAutoHealEnabled()) return "DISABLED";
  if (input.status === WhatsappPhoneNumberStatus.ACTIVE) return "DISABLED";
  if (input.autoHealAttempts >= AUTO_HEAL_MAX_ATTEMPTS) return "DISABLED";

  const le = input.lastEvent;
  if (!le || le.type !== "ERROR") return "DISABLED";

  const errType = classifyChannelError({ message: le.message });
  if (!allowedAutoHealErrorType(errType)) return "DISABLED";
  if (errType === "TOKEN_INVALID" && !input.hasStoredAccessToken) return "DISABLED";

  const coolMs = cooldownMsFor(errType);
  const now = Date.now();

  const errorAt = le.createdAt ? new Date(le.createdAt).getTime() : 0;
  const lastHeal = input.lastAutoHealAt ? input.lastAutoHealAt.getTime() : null;

  const ref = lastHeal ?? errorAt;
  if (ref <= 0) return "ACTIVE";
  if (now - ref < coolMs) return "COOLDOWN";

  return "ACTIVE";
}

/** Elegível para disparar tentativa agora (fila / scheduler). */
export function canAutoHeal(input: AutoHealEvaluationInput): boolean {
  return computeAutoHealStatus(input) === "ACTIVE";
}

function shouldLogSkipped(reason: string, metadata?: Record<string, unknown>) {
  console.info("[autoHeal] skipped", reason, metadata ?? {});
}

/**
 * Verificação leve do webhook: URL pública absoluta configurada (sem chamadas externas pesadas).
 */
export function simulateWebhookConfigurationCheck(): { ok: boolean; detail: string } {
  const url = resolveWebhookCallbackUrl();
  if (url.startsWith("https://") || url.startsWith("http://")) {
    return { ok: true, detail: "URL de callback resolvida no ambiente." };
  }
  return {
    ok: false,
    detail: "Defina NEXT_PUBLIC_WHATSAPP_APP_URL para uma URL absoluta do webhook.",
  };
}

/**
 * Uma tentativa de auto-healing: bloqueia concorrência por canal, não bloqueia a request HTTP.
 */
export async function attemptAutoHeal(channelId: string): Promise<void> {
  if (!isAutoHealEnabled()) return;
  const id = channelId.trim();
  if (!id || inFlight.has(id)) return;

  const row = await prisma.whatsappPhoneNumber.findUnique({
    where: { id },
  });
  if (!row) return;

  const lastEv = await prisma.whatsappChannelEvent.findFirst({
    where: { channelId: id },
    orderBy: { createdAt: "desc" },
    select: { type: true, message: true, createdAt: true },
  });

  const lastEvent = lastEv
    ? {
        type: lastEv.type,
        message: lastEv.message,
        createdAt: lastEv.createdAt.toISOString(),
      }
    : null;

  const evalInput: AutoHealEvaluationInput = {
    status: row.status,
    lastEvent,
    autoHealAttempts: row.autoHealAttempts,
    lastAutoHealAt: row.lastAutoHealAt,
    hasStoredAccessToken: Boolean(row.accessToken?.trim()),
  };

  if (!canAutoHeal(evalInput)) {
    return;
  }

  const errType = lastEvent ? classifyChannelError({ message: lastEvent.message }) : "UNKNOWN";
  if (!allowedAutoHealErrorType(errType)) return;

  console.info(
    "[autoHeal] attempt_begin",
    JSON.stringify({
      channelId: id,
      errorType: errType,
      autoHealAttempts: row.autoHealAttempts,
      phoneNumberId: row.phoneNumberId,
    })
  );

  inFlight.add(id);
  try {
    if (errType === "TOKEN_INVALID") {
      await attemptTokenAutoHeal(row);
    } else {
      await attemptWebhookAutoHeal(row);
    }
  } finally {
    inFlight.delete(id);
  }
}

async function attemptTokenAutoHeal(row: {
  id: string;
  phoneNumberId: string;
  accessToken: string | null;
  autoHealAttempts: number;
}): Promise<void> {
  const token = row.accessToken?.trim();
  if (!token) {
    await logChannelEvent({
      channelId: row.id,
      type: "AUTO_HEAL_SKIPPED",
      message: "Ignorado: sem token armazenado para repetir a validação automaticamente.",
      metadata: { reason: "no_stored_token", errorType: "TOKEN_INVALID" },
    });
    shouldLogSkipped("no token", { channelId: row.id });
    return;
  }

  if (row.autoHealAttempts >= AUTO_HEAL_MAX_ATTEMPTS) return;

  const now = new Date();
  await prisma.whatsappPhoneNumber.update({
    where: { id: row.id },
    data: {
      autoHealAttempts: { increment: 1 },
      lastAutoHealAt: now,
    },
  });

  await logChannelEvent({
    channelId: row.id,
    type: "AUTO_HEAL_ATTEMPT",
    message: "Tentativa automática iniciada: revalidar token na Cloud API.",
    metadata: { errorType: "TOKEN_INVALID", timestamp: now.toISOString() },
  });

  try {
    await activateWhatsappChannel({ channelId: row.id, accessToken: token });
    await prisma.whatsappPhoneNumber.update({
      where: { id: row.id },
      data: { autoHealAttempts: 0, lastAutoHealAt: null },
    });
    await logChannelEvent({
      channelId: row.id,
      type: "AUTO_HEAL_SUCCESS",
      message:
        "Correção automática concluída: token aceite pela Cloud API — canal ativado.",
      metadata: { errorType: "TOKEN_INVALID", timestamp: new Date().toISOString() },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await logChannelEvent({
      channelId: row.id,
      type: "AUTO_HEAL_FAILED",
      message: `Tentativa automática (token) falhou: ${msg.slice(0, 400)}`,
      metadata: {
        errorType: "TOKEN_INVALID",
        timestamp: new Date().toISOString(),
      },
    });
  }
}

async function attemptWebhookAutoHeal(row: {
  id: string;
  autoHealAttempts: number;
}): Promise<void> {
  if (row.autoHealAttempts >= AUTO_HEAL_MAX_ATTEMPTS) return;

  const now = new Date();
  await prisma.whatsappPhoneNumber.update({
    where: { id: row.id },
    data: {
      autoHealAttempts: { increment: 1 },
      lastAutoHealAt: now,
    },
  });

  await logChannelEvent({
    channelId: row.id,
    type: "AUTO_HEAL_ATTEMPT",
    message: "Tentativa automática iniciada: verificar URL de callback no ambiente.",
    metadata: { errorType: "WEBHOOK_INVALID", timestamp: now.toISOString() },
  });

  const sim = simulateWebhookConfigurationCheck();
  if (sim.ok) {
    await logChannelEvent({
      channelId: row.id,
      type: "AUTO_HEAL_SUCCESS",
      message: `Verificação automática OK (ambiente): ${sim.detail} Confirme ainda o painel da Meta se o erro persistir.`,
      metadata: {
        errorType: "WEBHOOK_INVALID",
        timestamp: new Date().toISOString(),
        simulated: true,
      },
    });
  } else {
    await logChannelEvent({
      channelId: row.id,
      type: "AUTO_HEAL_FAILED",
      message: `Verificação automática (ambiente) falhou: ${sim.detail}`,
      metadata: {
        errorType: "WEBHOOK_INVALID",
        timestamp: new Date().toISOString(),
      },
    });
  }
}

/** Desacopla da resposta HTTP (Next.js route). */
export function scheduleAutoHealDeferred(channelId: string, opts?: { autoHealAttempts?: number }): void {
  const id = channelId.trim();
  if (!id) return;
  if (shouldLogAutoHealSchedule()) {
    console.info(
      "[autoHeal] schedule_deferred",
      JSON.stringify({
        channelId: id,
        autoHealAttempts: opts?.autoHealAttempts ?? null,
        featureEnabled: isAutoHealEnabled(),
      })
    );
  }
  setTimeout(() => {
    void attemptAutoHeal(id).catch((e) => {
      console.error("[autoHeal] attemptAutoHeal failed", e);
    });
  }, 0);
}
