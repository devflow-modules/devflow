import type { WaInboxThreadRow } from "./inboxTypes";
import type { UserRole } from "@/modules/auth";

export type ComposerAuthorshipKind =
  | "channel"
  | "closed"
  | "other_assignee"
  | "session_unknown"
  | "status_unknown";

export type ComposerAuthorshipLock = {
  kind: ComposerAuthorshipKind;
  message: string;
  /** CTA disponível conforme permissão de UI (servidor continua a validar). */
  action: "reopen" | "assume" | null;
};

/**
 * Lock do composer por autoria/canal — fail-closed se sessão ou estado forem ambíguos.
 * Não expõe identidade do outro assignee além do necessário.
 */
export function resolveComposerAuthorshipLock(params: {
  thread: WaInboxThreadRow | null | undefined;
  outboundEnabled: boolean;
  sessionRole: UserRole | null;
  sessionLoading: boolean;
  /** false quando verify falhou / user id ausente após load. */
  sessionKnown: boolean;
}): ComposerAuthorshipLock | null {
  const { thread, outboundEnabled, sessionRole, sessionLoading, sessionKnown } = params;
  if (!thread) return null;

  if (!outboundEnabled) {
    return {
      kind: "channel",
      message:
        "Envio e sugestões com IA ficam disponíveis quando o canal WhatsApp estiver ativo na Meta.",
      action: null,
    };
  }

  if (sessionLoading) {
    return {
      kind: "session_unknown",
      message: "A confirmar a sua sessão… O envio permanece bloqueado.",
      action: null,
    };
  }

  if (!sessionKnown) {
    return {
      kind: "session_unknown",
      message: "Não confirmámos a sua sessão. Atualize a página antes de responder.",
      action: null,
    };
  }

  const status = typeof thread.status === "string" ? thread.status.trim() : "";
  if (!status) {
    return {
      kind: "status_unknown",
      message: "Estado da conversa indeterminado. O envio ficou bloqueado.",
      action: null,
    };
  }
  if (status === "CLOSED") {
    return {
      kind: "closed",
      message: "Conversa encerrada. Reabra para voltar a responder.",
      action: "reopen",
    };
  }
  if (status !== "OPEN" && status !== "PENDING") {
    return {
      kind: "status_unknown",
      message: "Estado da conversa indeterminado. O envio ficou bloqueado.",
      action: null,
    };
  }

  const isUnassigned = thread.isUnassigned ?? thread.assignedToUser == null;
  const isAssignedToMe = thread.isAssignedToMe === true;
  const hasOtherAssignee = Boolean(thread.assignedToUser) && !isUnassigned && !isAssignedToMe;

  if (hasOtherAssignee) {
    const canAssumeOther = sessionRole === "manager" || sessionRole === "platform_admin";
    return {
      kind: "other_assignee",
      message: "Outro operador é responsável por esta conversa.",
      action: canAssumeOther ? "assume" : null,
    };
  }

  // Assignee presente mas flags inconsistentes → fail-closed
  if (thread.assignedToUser && thread.isAssignedToMe == null && thread.isUnassigned == null) {
    return {
      kind: "status_unknown",
      message: "Não confirmámos o responsável desta conversa. O envio ficou bloqueado.",
      action: null,
    };
  }

  return null;
}
