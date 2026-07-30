/**
 * Links seguros de eventos recentes → Inbox (`?thread=`).
 * Fail-closed: ID ausente/inválido não gera href.
 */

const REJECTED_IDS = new Set(["null", "undefined", "-", "—", "n/a", "na"]);

/** Normaliza e valida conversationId para deep-link na Inbox. */
export function normalizeConversationId(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const id = raw.trim();
  if (!id) return null;
  if (REJECTED_IDS.has(id.toLowerCase())) return null;
  if (/\s/.test(id)) return null;
  if (id.length > 128) return null;
  return id;
}

/** Href canónico Inbox para a conversa, ou `null` se não linkável. */
export function buildInboxConversationHref(raw: string | null | undefined): string | null {
  const id = normalizeConversationId(raw);
  if (!id) return null;
  return `/inbox?thread=${encodeURIComponent(id)}`;
}

/** Nome acessível do link (visível + leitores de ecrã). */
export function inboxConversationLinkLabel(raw: string): string {
  const id = normalizeConversationId(raw) ?? raw.trim();
  const short = id.length > 12 ? `${id.slice(0, 12)}…` : id;
  return `Abrir conversa ${short} na Inbox`;
}
