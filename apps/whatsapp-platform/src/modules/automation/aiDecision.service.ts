export type AiClassificationResult = {
  intent: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
  recommendedAction?: string;
  confidence?: number;
};

export async function classifyIntent(message: string): Promise<AiClassificationResult> {
  const text = (message ?? "").toLowerCase().trim();
  let intent = "unknown";
  let priority: "LOW" | "MEDIUM" | "HIGH" = "MEDIUM";
  if (text.includes("cancelar")) { intent = "cancelamento"; priority = "HIGH"; }
  else if (text.includes("reclamação")) { intent = "reclamacao"; priority = "HIGH"; }
  else if (text.includes("olá") || text.includes("oi")) { intent = "saudacao"; priority = "LOW"; }
  return { intent, priority };
}

export async function detectUrgency(message: string): Promise<"LOW" | "MEDIUM" | "HIGH"> {
  const text = (message ?? "").toLowerCase();
  if (text.includes("urgente") || text.includes("emergência")) return "HIGH";
  return "MEDIUM";
}

export async function suggestAction(context: {
  messageText?: string;
  intent?: string;
}): Promise<{ action: string; params?: Record<string, unknown> } | null> {
  if (context.intent === "saudacao") {
    return { action: "sendMessage", params: { text: "Olá! Como posso ajudar?" } };
  }
  if (context.intent === "cancelamento") {
    return { action: "setPriority", params: { priority: "HIGH" } };
  }
  return null;
}
