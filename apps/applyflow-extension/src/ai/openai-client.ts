export type OpenAiChatResult =
  | { ok: true; text: string }
  | { ok: false; reason: string };

export async function openAiChatCompletion(args: {
  apiKey: string;
  model: string;
  system: string;
  user: string;
  maxTokens: number;
  temperature: number;
  timeoutMs?: number;
}): Promise<OpenAiChatResult> {
  const timeoutMs = args.timeoutMs ?? 55_000;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${args.apiKey}`,
      },
      body: JSON.stringify({
        model: args.model,
        messages: [
          { role: "system", content: args.system },
          { role: "user", content: args.user },
        ],
        max_tokens: args.maxTokens,
        temperature: args.temperature,
      }),
      signal: ctrl.signal,
    });

    if (res.status === 401) {
      return { ok: false, reason: "API key inválida ou revogada (401)." };
    }
    if (res.status === 429) {
      return { ok: false, reason: "Limite de pedidos OpenAI (429). Tente mais tarde." };
    }
    if (res.status >= 500) {
      return { ok: false, reason: `Servidor OpenAI indisponível (${res.status}).` };
    }

    if (!res.ok) {
      let detail = "";
      try {
        const j = (await res.json()) as { error?: { message?: string } };
        detail = j.error?.message ? `: ${j.error.message}` : "";
      } catch {
        /* ignore */
      }
      return { ok: false, reason: `Pedido OpenAI falhou (${res.status})${detail}` };
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = data.choices?.[0]?.message?.content?.trim() ?? "";
    if (!text) {
      return { ok: false, reason: "Resposta vazia da API." };
    }
    return { ok: true, text };
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      return { ok: false, reason: "Pedido expirou (timeout)." };
    }
    return { ok: false, reason: e instanceof Error ? e.message : "Erro de rede." };
  } finally {
    clearTimeout(t);
  }
}

/** Chamada mínima para validar credenciais (não usar para texto longo). */
export async function openAiPing(args: {
  apiKey: string;
  model: string;
  timeoutMs?: number;
}): Promise<OpenAiChatResult> {
  return openAiChatCompletion({
    apiKey: args.apiKey,
    model: args.model,
    system: "Reply with OK only.",
    user: "ping",
    maxTokens: 8,
    temperature: 0,
    timeoutMs: args.timeoutMs ?? 20_000,
  });
}
