import type { WaInboxThreadRow } from "./inboxTypes";

/**
 * Frases curtas sobre automação com base no estado já exposto na thread (sem API extra).
 */
export function automationStatusLines(thread: WaInboxThreadRow | null): string[] {
  if (!thread) return [];
  const out: string[] = [];
  const lr = thread.lastResponderType;
  if (lr === "ai") out.push("🤖 IA respondeu automaticamente na última interação");
  if (lr === "automation") out.push("⚡ Última mensagem foi automática (regra ou fluxo)");
  return out;
}
