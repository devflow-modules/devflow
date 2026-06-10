import type { AiAgentConfig } from "@/generated/prisma-whatsapp";

/** Decisão explícita da pipeline de IA (piloto / produção). */
export type AiDecision =
  | {
      action: "auto_reply";
      reason: string;
      confidence?: number;
      intent?: string;
      reply?: string;
    }
  | {
      action: "handoff";
      reason: string;
      confidence?: number;
      intent?: string;
    }
  | {
      action: "no_reply";
      reason: string;
      confidence?: number;
      intent?: string;
    };

export type AiPilotRuntimeConfig = {
  safeMode: boolean;
  minConfidence: number;
  fallbackToHuman: boolean;
};

const DEFAULT_MIN_CONFIDENCE = 0.65;

/** Safe mode activo por defeito (piloto); desligar com `WHATSAPP_AI_SAFE_MODE=0`. */
export function isAiPilotSafeModeEnabled(): boolean {
  const raw = process.env.WHATSAPP_AI_SAFE_MODE?.trim().toLowerCase();
  if (raw === "0" || raw === "false" || raw === "off") return false;
  return true;
}

export function getAiMinConfidenceThreshold(): number {
  const raw = process.env.WHATSAPP_AI_MIN_CONFIDENCE?.trim();
  if (!raw) return DEFAULT_MIN_CONFIDENCE;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > 1) return DEFAULT_MIN_CONFIDENCE;
  return n;
}

export function getAiPilotRuntimeConfig(config: Pick<AiAgentConfig, "fallbackToHuman">): AiPilotRuntimeConfig {
  return {
    safeMode: isAiPilotSafeModeEnabled(),
    minConfidence: getAiMinConfidenceThreshold(),
    fallbackToHuman: config.fallbackToHuman !== false,
  };
}

/** Temas comerciais/críticos — em safe mode força handoff antes do LLM. */
const PILOT_SAFE_HANDOFF_TOPICS = [
  "preço",
  "preco",
  "orçamento",
  "orcamento",
  "quanto custa",
  "reembolso",
  "cobrança",
  "cobranca",
  "cobrança contestada",
  "cobranca contestada",
  "jurídico",
  "juridico",
  "advogado",
] as const;

const SENSITIVE_INTENTS = new Set(["suporte"]);

export function evaluatePilotSafePreLlm(input: {
  messageText: string;
  safeMode: boolean;
}): AiDecision | null {
  if (!input.safeMode) return null;
  const lower = (input.messageText ?? "").toLowerCase();
  for (const topic of PILOT_SAFE_HANDOFF_TOPICS) {
    if (lower.includes(topic)) {
      return {
        action: "handoff",
        reason: `pilot_safe_topic:${topic}`,
      };
    }
  }
  return null;
}

export function resolveStructuredLlmDecision(input: {
  needsHuman?: boolean;
  confidence?: number;
  intent?: string;
  reply?: string;
  fallback?: boolean;
  error?: string;
  parseUncertain?: boolean;
  pilot: AiPilotRuntimeConfig;
}): AiDecision {
  const confidence = input.confidence;
  const intent = input.intent?.trim() || undefined;

  if (input.needsHuman) {
    return {
      action: "handoff",
      reason: "llm_needs_human",
      confidence,
      intent,
    };
  }

  if (input.fallback || input.error || !input.reply?.trim()) {
    if (input.pilot.fallbackToHuman || input.pilot.safeMode) {
      return {
        action: "handoff",
        reason: input.error ? "llm_error" : "llm_empty_reply",
        confidence,
        intent,
      };
    }
    return {
      action: "no_reply",
      reason: input.error ?? "llm_empty_reply",
      confidence,
      intent,
    };
  }

  if (input.pilot.safeMode && input.parseUncertain) {
    return {
      action: "handoff",
      reason: "llm_parse_uncertain",
      confidence: confidence ?? 0,
      intent,
    };
  }

  const conf = typeof confidence === "number" ? confidence : 0.5;

  if (input.pilot.safeMode && conf < input.pilot.minConfidence) {
    return {
      action: "handoff",
      reason: "low_confidence",
      confidence: conf,
      intent,
    };
  }

  if (input.pilot.safeMode && intent && SENSITIVE_INTENTS.has(intent.toLowerCase())) {
    return {
      action: "handoff",
      reason: "sensitive_intent",
      confidence: conf,
      intent,
    };
  }

  return {
    action: "auto_reply",
    reason: "llm_ok",
    confidence: conf,
    intent,
    reply: input.reply!.trim(),
  };
}

export function mapDecisionReasonToHandoffReason(
  reason: string
): "llm_needs_human" | "handoff_trigger_keyword" | "llm_low_confidence" | "llm_error" | "sensitive_intent" {
  if (reason === "llm_needs_human") return "llm_needs_human";
  if (reason === "llm_error" || reason === "llm_empty_reply" || reason === "llm_parse_uncertain") {
    return "llm_error";
  }
  if (reason === "low_confidence") return "llm_low_confidence";
  if (reason === "sensitive_intent") return "sensitive_intent";
  if (reason.startsWith("pilot_safe_topic:")) return "handoff_trigger_keyword";
  return "handoff_trigger_keyword";
}
