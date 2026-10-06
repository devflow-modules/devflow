/**
 * FAQ grounding tenant-scoped para IA (Client 1).
 * Sem vector DB — match simples por keywords / sobreposição lexical.
 */

import { prisma } from "@/lib/prisma";

export type FaqGroundingEntry = {
  id: string;
  question: string;
  answer: string;
  score: number;
};

export type FaqGroundingResult = {
  matches: FaqGroundingEntry[];
  /** Bloco pronto a injectar no system prompt (ou null se vazio). */
  promptBlock: string | null;
  supported: boolean;
};

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .split(/[^a-z0-9à-ú]+/i)
      .map((t) => t.trim())
      .filter((t) => t.length >= 3)
  );
}

function scoreFaq(messageTokens: Set<string>, faq: { question: string; answer: string; keywords: string | null }): number {
  const kw = (faq.keywords ?? "")
    .toLowerCase()
    .split(/[,;|\n]+/)
    .map((k) => k.trim())
    .filter(Boolean);
  let score = 0;
  for (const k of kw) {
    if (k.length >= 3 && [...messageTokens].some((t) => t.includes(k) || k.includes(t))) {
      score += 3;
    }
  }
  const qTokens = tokenize(faq.question);
  for (const t of messageTokens) {
    if (qTokens.has(t)) score += 2;
  }
  const aTokens = tokenize(faq.answer);
  for (const t of messageTokens) {
    if (aTokens.has(t)) score += 1;
  }
  return score;
}

export function formatFaqPromptBlock(matches: FaqGroundingEntry[]): string | null {
  if (matches.length === 0) return null;
  const lines = matches.map(
    (m, i) =>
      `${i + 1}. P: ${m.question.trim()}\n   R (aprovada): ${m.answer.trim()}`
  );
  return [
    "Base de conhecimento aprovada do tenant (FAQ). Responda APENAS com base nestes itens.",
    "Se a pergunta do cliente não estiver coberta, NÃO invente — indique que um humano irá ajudar.",
    ...lines,
  ].join("\n");
}

/**
 * Carrega FAQs do tenant e devolve os melhores matches para a mensagem.
 */
export async function groundMessageWithTenantFaq(params: {
  tenantId: string;
  messageText: string;
  limit?: number;
  minScore?: number;
}): Promise<FaqGroundingResult> {
  const limit = params.limit ?? 3;
  const minScore = params.minScore ?? 2;
  const messageTokens = tokenize(params.messageText ?? "");

  const faqs = await prisma.fAQ.findMany({
    where: { tenantId: params.tenantId },
    select: { id: true, question: true, answer: true, keywords: true },
    take: 200,
  });

  const scored = faqs
    .map((f) => ({
      id: f.id,
      question: f.question,
      answer: f.answer,
      score: scoreFaq(messageTokens, f),
    }))
    .filter((f) => f.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return {
    matches: scored,
    promptBlock: formatFaqPromptBlock(scored),
    supported: scored.length > 0,
  };
}
