/**
 * Primeira resposta automática (regras / sem LLM) — texto fixo, natural e por tenant.
 * Não usa OpenAI.
 */

export const DEFAULT_TEST_MESSAGE_PREFILL = "Olá! Gostaria de testar o atendimento.";
export const DEFAULT_TEST_MESSAGE_COPY = "Olá! Gostaria de testar o atendimento automático.";

const GREETINGS = ["Olá!", "Oi!", "Olá 👋"] as const;

function stableIndex(seed: string, modulo: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return modulo > 0 ? h % modulo : 0;
}

export function pickGreeting(tenantId: string): string {
  return GREETINGS[stableIndex(tenantId, GREETINGS.length)] ?? GREETINGS[0];
}

/** businessType livre do tenant — mapeamos quando reconhecemos. */
const OBJECTIVE_HINTS: ReadonlyArray<{ match: RegExp; phrase: string }> = [
  { match: /restaur|food|comida|menu/i, phrase: "pedidos e o menu" },
  { match: /cl[ií]nic|sa[uú]de|m[eé]dic|dent/i, phrase: "agendamentos e dúvidas" },
  { match: /im[oó]vel|imob/i, phrase: "imóveis e visitas" },
  { match: /loja|varejo|shop|e-?commerce|ecommerce/i, phrase: "produtos e compras" },
  { match: /servi[cç]o|suporte|tech/i, phrase: "suporte e dúvidas" },
];

export function objectivePhraseFromBusinessType(businessType: string | null | undefined): string {
  const raw = businessType?.trim();
  if (!raw) return "o seu atendimento";
  for (const { match, phrase } of OBJECTIVE_HINTS) {
    if (match.test(raw)) return phrase;
  }
  return "o seu atendimento";
}

export type FirstAutomaticReplyInput = {
  tenantId: string;
  businessName: string | null | undefined;
  businessType: string | null | undefined;
};

export function buildFirstAutomaticReply(input: FirstAutomaticReplyInput): string {
  const name = input.businessName?.trim() || "a nossa equipa";
  const greeting = pickGreeting(input.tenantId);
  const objective = objectivePhraseFromBusinessType(input.businessType);
  return `${greeting} Sou o assistente da ${name}.

Posso ajudar com ${objective}.

Como posso ajudar hoje?`;
}
