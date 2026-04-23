import type { Lead } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma-root";
import { getWhatsappCrmPrisma } from "./whatsapp-crm-db";
import type { CrmWhatsappSession } from "./crm-whatsapp-auth";

const ASSIGNABLE_ROLES = ["operator", "manager", "platform_admin"] as const;

/**
 * Garante que o utilizador WA existe, pertence ao tenant, e tem papel de operação.
 */
export async function assertWhatsappUserIsAssignable(
  userId: string,
  tenantId: string
): Promise<{ id: string; name: string; email: string }> {
  const user = await getWhatsappCrmPrisma().user.findFirst({
    where: { id: userId, tenantId, role: { in: [...ASSIGNABLE_ROLES] } },
    select: { id: true, name: true, email: true, role: true },
  });
  if (!user) {
    throw new Error("Utilizador inválido para atribuição (tenant ou função).");
  }
  return { id: user.id, name: user.name, email: user.email };
}

export async function getWhatsappUserForDisplay(
  userId: string
): Promise<{ id: string; name: string; email: string } | null> {
  const u = await getWhatsappCrmPrisma().user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true },
  });
  return u;
}

/** Operadores e gestores do tenant (relistagem, filtros, reatribuição). */
export async function listAssignableWhatsappUsersForTenant(
  tenantId: string
): Promise<{ id: string; name: string; email: string }[]> {
  try {
    return await getWhatsappCrmPrisma().user.findMany({
      where: { tenantId, role: { in: [...ASSIGNABLE_ROLES] } },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });
  } catch {
    return [];
  }
}

/**
 * Sincroniza o responsável do lead com o assignee da thread, se ainda vazio.
 */
export async function syncLeadAssigneeFromThreadIfEmpty(lead: Lead): Promise<Lead | null> {
  if (!lead.conversationRef) return null;
  if (lead.assignedOperatorId) return null;
  const thread = await getWhatsappCrmPrisma().waInboxThread.findFirst({
    where: { id: lead.conversationRef },
    select: { id: true, assignedToUserId: true, tenantId: true },
  });
  if (!thread?.assignedToUserId) return null;
  if (thread.tenantId) {
    const ok = await getWhatsappCrmPrisma().user.findFirst({
      where: {
        id: thread.assignedToUserId,
        tenantId: thread.tenantId,
        role: { in: [...ASSIGNABLE_ROLES] },
      },
      select: { id: true },
    });
    if (!ok) return null;
  }
  return prisma.lead.update({
    where: { id: lead.id },
    data: { assignedOperatorId: thread.assignedToUserId },
  });
}

/**
 * Filtros de atribuição: `scope=mine|unassigned|all` e/ou `operatorId=…`.
 * `mine` sem sessão → conjunto vazio.
 */
export function appendLeadAssignmentScopeFilters(
  parts: Prisma.LeadWhereInput[],
  searchParams: URLSearchParams,
  session: CrmWhatsappSession | null
): void {
  const scope = searchParams.get("scope")?.trim().toLowerCase();
  const opParam = searchParams.get("operatorId")?.trim();
  if (scope === "mine") {
    if (session) {
      parts.push({ assignedOperatorId: session.sub });
    } else {
      parts.push({ id: { in: [] } });
    }
  } else if (scope === "unassigned") {
    parts.push({ assignedOperatorId: null });
  }
  if (opParam) {
    parts.push({ assignedOperatorId: opParam });
  }
}
