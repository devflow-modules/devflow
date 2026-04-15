/**
 * Rótulos de produto para roles (apenas copy — não altera autorização).
 * operator → Operador · manager → Admin · platform_admin → contexto plataforma
 */

import type { UserRole } from "@/modules/auth";
import { isOperator, isPlatformAdmin, isTenantManager } from "./roles";

/** Indicador curto no header / shell (ex.: "Modo operador"). */
export function productModeBadgeLabel(role: UserRole | null | undefined): string {
  if (!role) return "";
  if (isPlatformAdmin(role)) return "Modo plataforma";
  if (isTenantManager(role)) return "Modo admin";
  return "Modo operador";
}

/** Nome curto do perfil na sessão atual (para "Você (…)"). */
export function productRoleNameForSession(role: UserRole | null | undefined): string {
  if (!role) return "";
  if (isPlatformAdmin(role)) return "Plataforma";
  if (isTenantManager(role)) return "Admin";
  return "Operador";
}

export type InboxAssigneeCopy = {
  /** Linha única pronta a mostrar (sem HTML). */
  line: string;
  /** Nota opcional abaixo (ex.: admin assumiu). */
  note?: string;
};

/**
 * Copy do responsável na conversa — sem role do destinatário na API;
 * para "Você" usa a sessão; para terceiros: "Responsável: nome".
 */
export function inboxAssigneeCopy(input: {
  assignedToUser: { id: string; name: string | null } | null | undefined;
  isAssignedToMe: boolean | undefined;
  sessionRole: UserRole | null;
  authUserId: string | undefined;
  threadStatus: string;
}): InboxAssigneeCopy {
  const { assignedToUser, isAssignedToMe, sessionRole, authUserId, threadStatus } = input;

  if (threadStatus === "CLOSED" && !assignedToUser?.id) {
    return { line: "—" };
  }

  if (!assignedToUser?.id) {
    return { line: "" };
  }

  const name = assignedToUser.name?.trim() || "—";
  const isMe = Boolean(authUserId && assignedToUser.id === authUserId);

  if (isMe && sessionRole) {
    const pr = productRoleNameForSession(sessionRole);
    let note: string | undefined;
    if (isAssignedToMe) {
      if (sessionRole === "manager") {
        note = "Admin assumiu esta conversa.";
      } else if (sessionRole === "platform_admin") {
        note = "Equipa da plataforma nesta conversa.";
      } else if (isOperator(sessionRole)) {
        note = "Operador a tratar esta conversa.";
      }
    }
    return { line: `Você (${pr})`, note };
  }

  return { line: `Responsável: ${name}` };
}
