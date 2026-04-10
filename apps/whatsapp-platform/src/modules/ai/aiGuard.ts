import type { AiAgentConfig } from "@/generated/prisma-whatsapp";
import { WaInboxThreadStatus } from "@/generated/prisma-whatsapp";

/** Limite defensivo — mensagens muito longas podem ser abuso ou cópia acidental. */
export const AI_GUARD_MAX_INBOUND_CHARS = 3500;

export type AiGuardThreadSlice = {
  id: string;
  assignedToUserId: string | null;
  status: WaInboxThreadStatus;
};

export type AiGuardDecision = {
  allow: boolean;
  reason: string;
  confidence?: number;
};

export type AiGuardContext = {
  messageText: string;
  config: AiAgentConfig;
  thread: AiGuardThreadSlice;
  /** Para testes / simulação */
  now?: Date;
};

const SENSITIVE_KEYWORDS = ["processo", "procon", "reclamação", "reclamacao", "cancelar"] as const;

function hourInSaoPaulo(d: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Sao_Paulo",
    hour: "numeric",
    hour12: false,
  }).formatToParts(d);
  return Number(parts.find((p) => p.type === "hour")?.value ?? 12);
}

function weekdayIndexSaoPaulo(d: Date): number {
  const s = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
  }).format(d);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(s);
}

/** Dias úteis 9h–18h em America/São_Paulo (MVP). */
export function isOutsideDefaultBusinessHours(now: Date): boolean {
  const wd = weekdayIndexSaoPaulo(now);
  if (wd === 0 || wd === 6) return true;
  const h = hourInSaoPaulo(now);
  return h < 9 || h >= 18;
}

/**
 * Camada obrigatória antes de chamar o LLM na automação WhatsApp.
 * Não substitui checks de quota / plano (feitos antes na pipeline).
 */
export function shouldAiReply(ctx: AiGuardContext): AiGuardDecision {
  const now = ctx.now ?? new Date();
  const raw = ctx.messageText ?? "";
  const text = raw.trim();

  if (!text) {
    return { allow: false, reason: "empty_message", confidence: 1 };
  }
  if (!ctx.config.enabled) {
    return { allow: false, reason: "ai_disabled", confidence: 1 };
  }
  if (!ctx.config.autoReply) {
    return { allow: false, reason: "auto_reply_off", confidence: 1 };
  }
  if (raw.length > AI_GUARD_MAX_INBOUND_CHARS) {
    return { allow: false, reason: "message_too_long", confidence: 1 };
  }

  const lower = text.toLowerCase();
  for (const kw of SENSITIVE_KEYWORDS) {
    if (lower.includes(kw)) {
      return { allow: false, reason: `sensitive_keyword:${kw}`, confidence: 1 };
    }
  }

  if (ctx.thread.status !== WaInboxThreadStatus.OPEN) {
    return { allow: false, reason: "thread_not_open", confidence: 1 };
  }
  if (ctx.thread.assignedToUserId) {
    return { allow: false, reason: "human_assigned", confidence: 1 };
  }

  const ooh = (ctx.config.outOfHoursReply ?? "").trim();
  if (ooh.length > 0 && isOutsideDefaultBusinessHours(now)) {
    return { allow: false, reason: "outside_business_hours", confidence: 1 };
  }

  return { allow: true, reason: "ok", confidence: 0.95 };
}
