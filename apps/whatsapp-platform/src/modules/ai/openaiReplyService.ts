/**
 * Geração de resposta via OpenAI para atendimento WhatsApp.
 * Usado quando OPENAI_API_KEY está configurada.
 */

const DEFAULT_SYSTEM_PROMPT = `Você é um assistente de atendimento via WhatsApp da DevFlow Labs.
Seja breve, claro e cordial. Responda em português do Brasil.
Máximo de poucos parágrafos curtos. Mantenha tom profissional e prestativo.`;

const DEFAULT_MODEL = "gpt-4o-mini";
const DEFAULT_MAX_TOKENS = 512;
const DEFAULT_TEMPERATURE = 0.7;

function getApiKey(): string | undefined {
  return typeof process !== "undefined" ? process.env.OPENAI_API_KEY : undefined;
}

function getModel(): string {
  return typeof process !== "undefined"
    ? (process.env.OPENAI_MODEL ?? DEFAULT_MODEL)
    : DEFAULT_MODEL;
}

/**
 * Gera resposta via OpenAI. Usa fetch (sem SDK) para manter consistência com o projeto.
 * @throws em erro de rede/API — o caller deve fazer fallback para legacy.
 */
export async function generateReply(
  message: string,
  options?: {
    systemPrompt?: string;
    model?: string;
    maxTokens?: number;
    temperature?: number;
  }
): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey?.trim()) {
    throw new Error("OPENAI_API_KEY não configurada");
  }

  const systemPrompt = options?.systemPrompt?.trim() || DEFAULT_SYSTEM_PROMPT;
  const model = options?.model ?? getModel();
  const maxTokens = options?.maxTokens ?? DEFAULT_MAX_TOKENS;
  const temperature = options?.temperature ?? DEFAULT_TEMPERATURE;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      max_tokens: maxTokens,
      temperature,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI ${res.status}: ${err.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = data.choices?.[0]?.message?.content?.trim() ?? "";
  return text || "Não consegui gerar uma resposta. Tente novamente.";
}

/**
 * Verifica se OpenAI está configurada.
 */
export function isOpenAiConfigured(): boolean {
  return !!getApiKey()?.trim();
}
