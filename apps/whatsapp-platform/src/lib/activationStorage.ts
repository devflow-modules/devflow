/**
 * Estado de ativação pós-signup (localStorage). Não substitui métricas de servidor.
 */

const STORAGE_KEY = "df_whatsapp_activation_v1";

export type ActivationStorageState = {
  /** Utilizador abriu a Inbox pelo menos uma vez (fluxo guiado). */
  inboxVisited?: boolean;
  /** Primeira resposta humana enviada (cliente). */
  firstReplyAt?: string;
  /** Já mostrámos o toast da primeira mensagem recebida. */
  firstMessageToastSeen?: boolean;
  /** Já mostrámos o toast da primeira resposta. */
  firstReplyToastSeen?: boolean;
  /** Banner “responder primeira mensagem” dispensado. */
  firstReplyBannerDismissed?: boolean;
  /** Evita duplicar o log `first_message_received` (Inbox vs onboarding). */
  firstMessageEventLogged?: boolean;
};

function read(): ActivationStorageState {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const j = JSON.parse(raw) as ActivationStorageState;
    return typeof j === "object" && j !== null ? j : {};
  } catch {
    return {};
  }
}

function write(next: ActivationStorageState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota */
  }
}

export function getActivationState(): ActivationStorageState {
  return read();
}

export function markInboxVisited(): void {
  const prev = read();
  write({ ...prev, inboxVisited: true });
}

function notifyActivationUpdate(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("df-activation-update"));
}

export function markFirstReplySent(): void {
  const prev = read();
  if (prev.firstReplyAt) return;
  write({ ...prev, firstReplyAt: new Date().toISOString() });
  logActivationEvent("first_reply_sent");
  notifyActivationUpdate();
}

export function markFirstMessageToastSeen(): void {
  const prev = read();
  write({ ...prev, firstMessageToastSeen: true });
}

export function markFirstReplyToastSeen(): void {
  const prev = read();
  write({ ...prev, firstReplyToastSeen: true });
}

export function dismissFirstReplyBanner(): void {
  const prev = read();
  write({ ...prev, firstReplyBannerDismissed: true });
}

export function hasRecordedFirstReply(): boolean {
  return Boolean(read().firstReplyAt);
}

/** Regista uma vez o evento de primeira mensagem (há pelo menos uma conversa). */
export function ensureFirstMessageActivationLogged(threadTotal: number): void {
  if (threadTotal < 1) return;
  const prev = read();
  if (prev.firstMessageEventLogged) return;
  write({ ...prev, firstMessageEventLogged: true });
  logActivationEvent("first_message_received", { threads: threadTotal });
}

export type ActivationLogEvent =
  | "activation_started"
  | "whatsapp_connected"
  | "first_message_received"
  | "first_reply_sent";

export function logActivationEvent(
  event: ActivationLogEvent,
  extra?: Record<string, unknown>
): void {
  if (typeof console === "undefined" || !console.info) return;
  console.info("[WHATSAPP][Activation]", JSON.stringify({ event, ...extra, ts: new Date().toISOString() }));
}
