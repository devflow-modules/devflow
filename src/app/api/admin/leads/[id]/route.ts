import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma-root";
import { isAdminLeadsApiAllowed } from "@/lib/admin-leads-api-auth";
import { getCrmWhatsappSessionFromCookies } from "@/lib/crm-whatsapp-auth";
import { patchLeadOriginField } from "@/lib/outbound-lead-origins";
import {
  assertWhatsappUserIsAssignable,
  getWhatsappUserForDisplay,
  syncLeadAssigneeFromThreadIfEmpty,
} from "@/lib/lead-operator-service";
import { mirrorOutboundLeadIdToThread } from "@/lib/crm-sync";

const patchLeadSchema = z.object({
  name: z.string().trim().max(200).optional().nullable(),
  company: z.string().trim().max(200).optional().nullable(),
  phone: z.string().trim().min(3).max(40).optional(),
  status: z.string().trim().max(80).optional(),
  notes: z.string().trim().max(10_000).optional().nullable(),
  origin: patchLeadOriginField,
  nextFollowUpAt: z.union([z.string().max(100), z.null()]).optional(),
  conversationRef: z.string().trim().max(200).optional().nullable(),
  /** `whatsapp_users.id` no tenant da sessão */
  assignedOperatorId: z.union([z.string().min(1).max(64), z.null()]).optional(),
  /** Tipo de NBA usado no último "Executar" (apenas registo) */
  lastSuggestedActionType: z.string().trim().max(40).optional().nullable(),
});

type RouteContext = { params: Promise<{ id: string }> };

function parseNextFollowUp(
  v: string | null | undefined
): Date | null | "invalid" | "omit" {
  if (v === undefined) return "omit";
  if (v === null) return null;
  if (typeof v === "string" && v.trim() === "") return null;
  const t = v.trim();
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return "invalid";
  return d;
}

export async function PATCH(request: Request, context: RouteContext) {
  if (!(await isAdminLeadsApiAllowed(request))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchLeadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  if (
    data.name === undefined &&
    data.company === undefined &&
    data.phone === undefined &&
    data.status === undefined &&
    data.notes === undefined &&
    data.origin === undefined &&
    data.nextFollowUpAt === undefined &&
    data.conversationRef === undefined &&
    data.assignedOperatorId === undefined &&
    data.lastSuggestedActionType === undefined
  ) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const nfu = parseNextFollowUp(data.nextFollowUpAt);
  if (nfu === "invalid") {
    return NextResponse.json({ error: "nextFollowUpAt inválido" }, { status: 400 });
  }

  const session = await getCrmWhatsappSessionFromCookies();
  if (data.assignedOperatorId) {
    if (!session) {
      return NextResponse.json({ error: "Sessão necessária para atribuir responsável" }, { status: 400 });
    }
    try {
      await assertWhatsappUserIsAssignable(data.assignedOperatorId, session.tenantId);
    } catch {
      return NextResponse.json({ error: "Responsável inválido" }, { status: 400 });
    }
  }

  try {
    const current = await prisma.lead.findUnique({ where: { id } });
    if (!current) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const statusChanged = data.status !== undefined && data.status !== current.status;

    let lead = await prisma.lead.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.company !== undefined ? { company: data.company } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
        ...(data.origin !== undefined
          ? { origin: data.origin && data.origin.length > 0 ? data.origin : null }
          : {}),
        ...(nfu !== "omit" ? { nextFollowUpAt: nfu } : {}),
        ...(data.conversationRef !== undefined
          ? {
              conversationRef:
                data.conversationRef && data.conversationRef.length > 0
                  ? data.conversationRef
                  : null,
            }
          : {}),
        ...(data.assignedOperatorId !== undefined ? { assignedOperatorId: data.assignedOperatorId } : {}),
        ...(data.lastSuggestedActionType !== undefined
          ? {
              lastSuggestedActionType:
                data.lastSuggestedActionType && data.lastSuggestedActionType.length > 0
                  ? data.lastSuggestedActionType
                  : null,
            }
          : {}),
        ...(statusChanged ? { lastContactAt: new Date() } : {}),
      },
    });

    if (!lead.assignedOperatorId && lead.conversationRef) {
      const synced = await syncLeadAssigneeFromThreadIfEmpty(lead);
      if (synced) lead = synced;
    }

    if (data.conversationRef !== undefined) {
      const prevRef = current.conversationRef;
      const nextRef = lead.conversationRef;
      if (prevRef && prevRef !== nextRef) {
        await mirrorOutboundLeadIdToThread(prevRef, null);
      }
      if (nextRef) {
        await mirrorOutboundLeadIdToThread(nextRef, lead.id);
      } else if (prevRef) {
        await mirrorOutboundLeadIdToThread(prevRef, null);
      }
    }

    let assignedOperator: { id: string; name: string; email: string } | null = null;
    if (lead.assignedOperatorId) {
      try {
        assignedOperator =
          (await getWhatsappUserForDisplay(lead.assignedOperatorId)) ?? {
            id: lead.assignedOperatorId,
            name: "—",
            email: "—",
          };
      } catch {
        assignedOperator = { id: lead.assignedOperatorId, name: "—", email: "—" };
      }
    }

    return NextResponse.json({ lead: { ...lead, assignedOperator } });
  } catch (e: unknown) {
    const code = typeof e === "object" && e !== null && "code" in e ? (e as { code?: string }).code : undefined;
    if (code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
