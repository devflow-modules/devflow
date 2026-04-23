import { NextResponse } from "next/server";
import type { Lead, Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma-root";
import { isAdminLeadsApiAllowed } from "@/lib/admin-leads-api-auth";
import { getCrmWhatsappSessionFromCookies } from "@/lib/crm-whatsapp-auth";
import { createLeadOriginField } from "@/lib/outbound-lead-origins";
import { sortOutboundLeadsByCommercialPriority } from "@/lib/admin-outbound-leads";
import { buildPrismaWhereForFollowupFilter } from "@/lib/admin-lead-followup";
import { buildConversionMetricsFromGroupBy } from "@/lib/admin-lead-conversion-metrics";
import { buildStaleLeadWhereInput, daysSinceLastContactAt } from "@/lib/admin-lead-stale";
import { getLeadActionState, getSuggestedAction, pickActionListWithState } from "@/lib/admin-lead-actions";
import { getWhatsappCrmPrisma } from "@/lib/whatsapp-crm-db";
import {
  assertWhatsappUserIsAssignable,
  appendLeadAssignmentScopeFilters,
  getWhatsappUserForDisplay,
  listAssignableWhatsappUsersForTenant,
  syncLeadAssigneeFromThreadIfEmpty,
} from "@/lib/lead-operator-service";

const createLeadSchema = z.object({
  name: z.string().trim().max(200).optional().nullable(),
  company: z.string().trim().max(200).optional().nullable(),
  phone: z.string().trim().min(3).max(40),
  status: z.string().trim().max(80).optional(),
  notes: z.string().trim().max(10_000).optional().nullable(),
  /** Slugs canónicos: ver `outbound-lead-origins.ts` */
  origin: createLeadOriginField,
  nextFollowUpAt: z.string().max(100).optional().nullable(),
});

function isOverdueFollowUpParam(v: string | null): boolean {
  return v === "1" || v === "true" || v === "yes";
}

function buildWhereFromParams(
  searchParams: URLSearchParams,
  opts: { includeStatusFilter: boolean },
  session: Awaited<ReturnType<typeof getCrmWhatsappSessionFromCookies>>
): Prisma.LeadWhereInput {
  const parts: Prisma.LeadWhereInput[] = [];
  if (opts.includeStatusFilter) {
    const status = searchParams.get("status")?.trim();
    if (status) parts.push({ status });
  }
  const origin = searchParams.get("origin")?.trim();
  if (origin) parts.push({ origin });

  const follow = searchParams.get("followup")?.trim();
  if (follow === "overdue" || follow === "today" || follow === "none") {
    parts.push(buildPrismaWhereForFollowupFilter(follow));
  } else if (isOverdueFollowUpParam(searchParams.get("overdueFollowUp"))) {
    parts.push(buildPrismaWhereForFollowupFilter("overdue"));
  }

  const staleQ = searchParams.get("stale")?.trim();
  if (staleQ === "true" || staleQ === "1") {
    parts.push(buildStaleLeadWhereInput());
  }

  appendLeadAssignmentScopeFilters(parts, searchParams, session);

  if (parts.length === 0) return {};
  if (parts.length === 1) return parts[0]!;
  return { AND: parts };
}

async function attachAssignedOperatorsLeads<T extends { assignedOperatorId: string | null }>(
  rows: T[]
): Promise<(T & { assignedOperator: { id: string; name: string; email: string } | null })[]> {
  const ids = [...new Set(rows.map((r) => r.assignedOperatorId).filter(Boolean))] as string[];
  if (ids.length === 0) {
    return rows.map((r) => ({ ...r, assignedOperator: null }));
  }
  try {
    const users = await getWhatsappCrmPrisma().user.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, email: true },
    });
    const m = new Map(users.map((u) => [u.id, u] as const));
    return rows.map((r) => ({
      ...r,
      assignedOperator: r.assignedOperatorId
        ? (m.get(r.assignedOperatorId) ?? { id: r.assignedOperatorId, name: "—", email: "—" })
        : null,
    }));
  } catch {
    return rows.map((r) => ({
      ...r,
      assignedOperator: r.assignedOperatorId
        ? { id: r.assignedOperatorId, name: "—", email: "—" }
        : null,
    }));
  }
}

export async function GET(request: Request) {
  if (!(await isAdminLeadsApiAllowed(request))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const session = await getCrmWhatsappSessionFromCookies();

  const opFilter = searchParams.get("operatorId")?.trim();
  if (opFilter && session) {
    try {
      await assertWhatsappUserIsAssignable(opFilter, session.tenantId);
    } catch {
      return NextResponse.json({ error: "Operador inválido para este contexto" }, { status: 400 });
    }
  }

  try {
    const listWhere = buildWhereFromParams(searchParams, { includeStatusFilter: true }, session);
    const summaryWhere = buildWhereFromParams(searchParams, { includeStatusFilter: false }, session);

    const [rawList, groupRows] = await Promise.all([
      prisma.lead.findMany({
        where: Object.keys(listWhere).length ? listWhere : undefined,
      }),
      prisma.lead.groupBy({
        by: ["status"],
        where: Object.keys(summaryWhere).length ? summaryWhere : undefined,
        _count: { _all: true },
      }),
    ]);

    const syncConvo = searchParams.get("syncFromConversation") === "1";
    let listAfterSync = rawList as Lead[];
    if (syncConvo) {
      const slice = listAfterSync.slice(0, 50).filter((l) => l.conversationRef && !l.assignedOperatorId);
      await Promise.all(
        slice.map(async (l) => {
          const u = await syncLeadAssigneeFromThreadIfEmpty(l);
          if (u) {
            const idx = listAfterSync.findIndex((x) => x.id === l.id);
            if (idx >= 0) listAfterSync[idx] = u;
          }
        })
      );
    }

    const withOperators = await attachAssignedOperatorsLeads(
      listAfterSync as { assignedOperatorId: string | null }[]
    );

    const ordered = sortOutboundLeadsByCommercialPriority(withOperators as unknown as Lead[]);
    const leads = ordered.map((l) => {
      const lead = l as Lead & {
        assignedOperator?: { id: string; name: string; email: string } | null;
      };
      const daysSinceLastContact = daysSinceLastContactAt(lead.lastContactAt);
      const forAction = {
        status: lead.status,
        lastContactAt: lead.lastContactAt,
        name: lead.name,
        company: lead.company,
        phone: lead.phone,
        id: lead.id,
      };
      const leadActionState = getLeadActionState(forAction);
      const suggestedAction = getSuggestedAction(forAction, leadActionState);
      return { ...lead, daysSinceLastContact, leadActionState, suggestedAction };
    });
    const actionList = pickActionListWithState(leads);
    const { byStatus, conversionMetrics, funnelStageCounts } = buildConversionMetricsFromGroupBy(groupRows);
    const summaryTotal = conversionMetrics.total;

    const operators = session
      ? await listAssignableWhatsappUsersForTenant(session.tenantId)
      : [];

    return NextResponse.json({
      leads,
      actionList,
      currentUserId: session?.sub ?? null,
      operators,
      summary: {
        byStatus,
        countsByStatus: byStatus,
        funnelStageCounts,
        total: summaryTotal,
        conversionMetrics,
      },
    });
  } catch (e) {
    console.error("[GET /api/admin/leads]", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

function parseCreateNextFollowUp(
  s: string | null | undefined
): { ok: true; value: Date | null } | { ok: false } {
  if (s === undefined || s === null) return { ok: true, value: null };
  if (s.trim() === "") return { ok: true, value: null };
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return { ok: false };
  return { ok: true, value: d };
}

export async function POST(request: Request) {
  if (!(await isAdminLeadsApiAllowed(request))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createLeadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const { name, company, phone, status, notes, origin, nextFollowUpAt } = parsed.data;
  const nfuP = parseCreateNextFollowUp(nextFollowUpAt);
  if (!nfuP.ok) {
    return NextResponse.json({ error: "nextFollowUpAt inválido" }, { status: 400 });
  }

  const session = await getCrmWhatsappSessionFromCookies();
  let assignee: string | null = null;
  if (session) {
    try {
      await assertWhatsappUserIsAssignable(session.sub, session.tenantId);
      assignee = session.sub;
    } catch {
      assignee = null;
    }
  }

  try {
    const lead = await prisma.lead.create({
      data: {
        phone,
        name: name ?? null,
        company: company ?? null,
        notes: notes ?? null,
        origin: origin ?? null,
        nextFollowUpAt: nfuP.value,
        assignedOperatorId: assignee,
        ...(status ? { status } : {}),
      },
    });
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
    return NextResponse.json({ lead: { ...lead, assignedOperator } }, { status: 201 });
  } catch (e) {
    console.error("[POST /api/admin/leads]", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
