/**
 * Structured output — reply, intent, confidence, needs_human.
 * Usa response_format json_object quando disponível.
 */

export interface StructuredReply {
  reply: string;
  intent: string;
  confidence: number;
  needs_human: boolean;
  /** true quando o JSON não pôde ser interpretado de forma fiável. */
  parseUncertain?: boolean;
}

const STRUCTURED_SYSTEM_SUFFIX = `

Responda SEMPRE em JSON válido com exatamente:
{
  "reply": "sua resposta ao usuário (texto que será enviado)",
  "intent": "qualificação|informação|suporte|vendas|outro",
  "confidence": 0.0 a 1.0,
  "needs_human": true ou false
}`;

/**
 * Tenta parsear JSON da resposta. Se falhar, retorna reply como texto e defaults.
 */
export function parseStructuredOutput(raw: string): StructuredReply {
  const trimmed = raw.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return {
      reply: trimmed || "Não consegui processar. Como posso ajudar?",
      intent: "outro",
      confidence: 0,
      needs_human: false,
      parseUncertain: true,
    };
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as Partial<StructuredReply>;
    return {
      reply:
        typeof parsed.reply === "string" && parsed.reply.trim()
          ? parsed.reply.trim()
          : "Como posso ajudar?",
      intent:
        typeof parsed.intent === "string" && parsed.intent
          ? parsed.intent.slice(0, 50)
          : "outro",
      confidence:
        typeof parsed.confidence === "number" && parsed.confidence >= 0 && parsed.confidence <= 1
          ? parsed.confidence
          : 0.5,
      needs_human: Boolean(parsed.needs_human),
    };
  } catch {
    return {
      reply: trimmed || "Como posso ajudar?",
      intent: "outro",
      confidence: 0,
      needs_human: false,
      parseUncertain: true,
    };
  }
}

export function getStructuredSystemSuffix(): string {
  return STRUCTURED_SYSTEM_SUFFIX;
}
