/**
 * Classificação de intent genérica (regras simples).
 * Produtos podem substituir por modelo próprio; este é fallback.
 */

import type { IntentResult, IntentLabel } from "./types";

const GREETING = /^(oi|olá|ola|hey|bom dia|boa tarde|boa noite|hello|hi)\b/i;
const FAREWELL = /^(tchau|até mais|ate mais|obrigad[oa]|vlw|flw)\b/i;
const QUESTION = /\?|^(como|quando|onde|por que|qual|quais)\b/i;

export function classifyIntent(text: string): IntentResult {
  const t = text.trim();
  if (!t) return { intent: "unknown", confidence: 0 };
  if (GREETING.test(t)) return { intent: "greeting", confidence: 0.9 };
  if (FAREWELL.test(t)) return { intent: "farewell", confidence: 0.85 };
  if (QUESTION.test(t)) return { intent: "question", confidence: 0.8 };
  if (/\b(reclamação|reclamar|problema|erro)\b/i.test(t)) return { intent: "complaint", confidence: 0.75 };
  return { intent: "unknown", confidence: 0.5 };
}

export type { IntentLabel, IntentResult };
