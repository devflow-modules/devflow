/**
 * Helpers para status de mensagem (sent, delivered, read, failed).
 * Apenas tipagem e utilitários; sem persistência.
 */

import type { MessageStatus } from "./types";

export function isTerminalStatus(status: MessageStatus["status"]): boolean {
  return status === "read" || status === "failed";
}

export function parseStatusFromWebhook(entry: unknown): MessageStatus | null {
  if (!entry || typeof entry !== "object") return null;
  const o = entry as Record<string, unknown>;
  const id = typeof o.id === "string" ? o.id : "";
  const status = typeof o.status === "string" ? o.status : "";
  if (!id || !["sent", "delivered", "read", "failed"].includes(status)) return null;
  return {
    id,
    status: status as MessageStatus["status"],
    timestamp: typeof o.timestamp === "string" ? o.timestamp : undefined,
  };
}
