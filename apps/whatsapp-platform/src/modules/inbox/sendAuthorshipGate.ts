/**
 * Autoria do envio humano na Inbox — fail-closed.
 * CLOSED e assignee alheio bloqueiam novas chamadas Meta; replay/reconcile do ledger não passam por aqui.
 */
export const SEND_AUTHORSHIP_CODES = {
  THREAD_CLOSED: "THREAD_CLOSED",
  THREAD_ASSIGNED_TO_OTHER: "THREAD_ASSIGNED_TO_OTHER",
  THREAD_STATUS_UNKNOWN: "THREAD_STATUS_UNKNOWN",
  CALLER_UNKNOWN: "SEND_CALLER_UNKNOWN",
} as const;

export type SendAuthorshipCode =
  (typeof SEND_AUTHORSHIP_CODES)[keyof typeof SEND_AUTHORSHIP_CODES];

export type SendAuthorshipInput = {
  status: string | null | undefined;
  assignedToUserId: string | null | undefined;
  callerUserId: string | null | undefined;
};

export type SendAuthorshipResult =
  | { ok: true }
  | { ok: false; code: SendAuthorshipCode; message: string };

const KNOWN_SENDABLE_STATUS = new Set(["OPEN", "PENDING"]);

/**
 * Avalia se o caller pode iniciar/retomar um envio Meta nesta thread.
 * Não cobre COMPLETED/META_ACCEPTED do ledger (reconcile/replay).
 */
export function evaluateSendAuthorship(input: SendAuthorshipInput): SendAuthorshipResult {
  const caller = typeof input.callerUserId === "string" ? input.callerUserId.trim() : "";
  if (!caller) {
    return {
      ok: false,
      code: SEND_AUTHORSHIP_CODES.CALLER_UNKNOWN,
      message: "Sessão inválida para enviar. Atualize a página e tente novamente.",
    };
  }

  const status = typeof input.status === "string" ? input.status.trim() : "";
  if (!status) {
    return {
      ok: false,
      code: SEND_AUTHORSHIP_CODES.THREAD_STATUS_UNKNOWN,
      message: "Estado da conversa indeterminado. O envio ficou bloqueado.",
    };
  }
  if (status === "CLOSED") {
    return {
      ok: false,
      code: SEND_AUTHORSHIP_CODES.THREAD_CLOSED,
      message: "Conversa encerrada. Reabra a conversa para responder.",
    };
  }
  if (!KNOWN_SENDABLE_STATUS.has(status)) {
    return {
      ok: false,
      code: SEND_AUTHORSHIP_CODES.THREAD_STATUS_UNKNOWN,
      message: "Estado da conversa indeterminado. O envio ficou bloqueado.",
    };
  }

  const assignee =
    typeof input.assignedToUserId === "string" && input.assignedToUserId.trim()
      ? input.assignedToUserId.trim()
      : null;
  if (assignee && assignee !== caller) {
    return {
      ok: false,
      code: SEND_AUTHORSHIP_CODES.THREAD_ASSIGNED_TO_OTHER,
      message: "Outro operador é responsável por esta conversa. Assuma-a antes de responder.",
    };
  }

  return { ok: true };
}

/** Ledger já na Meta ou completo: não reaplicar gate de autoria (evita bloquear reconcile). */
export function shouldEnforceSendAuthorship(ledgerStatus: string | null | undefined): boolean {
  if (!ledgerStatus) return true;
  return ledgerStatus !== "COMPLETED" && ledgerStatus !== "META_ACCEPTED" && ledgerStatus !== "SENDING";
}
