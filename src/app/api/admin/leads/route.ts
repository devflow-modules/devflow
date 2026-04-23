import { NextResponse } from "next/server";
import type { Lead, Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma-root";
import { isAdminLeadsApiAllowed } from "@/lib/admin-leads-api-auth";
import { sortOutboundLeadsByCommercialPriority } from "@/lib/admin-outbound-leads";
import { buildPrismaWhereForFollowupFilter } from "@/lib/admin-lead-followup";
import { buildConversionMetricsFromGroupBy } from "@/lib/admin-lead-conversion-metrics";
import { buildStaleLeadWhereInput, daysSinceLastContactAt } from "@/lib/admin-lead-stale";
import { getLeadActionState, getSuggestedAction, pickActionListWithState } from "@/lib/admin-lead-actions";

const createLeadSchema = z.object({
  name: z.string().trim().max(200).optional().nullable(),
  company: z.string().trim().max(200).optional().nullable(),
  phone: z.string().trim().min(3).max(40),
  status: z.string().trim().max(80).optional(),
  notes: z.string().trim().max(10_000).optional().nullable(),
  origin: z.string().trim().max(120).optional().nullable(),
  nextFollowUpAt: z.string().max(100).optional().nullable(),
});

function isOverdueFollowUpParam(v: string | null): boolean {
  return v === "1" || v === "true" || v === "yes";
}

function buildWhereFromParams(
  searchParams: URLSearchParams,
  opts: { includeStatusFilter: boolean }
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

  if (parts.length === 0) return {};
  if (parts.length === 1) return parts[0]!;
  return { AND: parts };
}

export async function GET(request: Request) {
  if (!(await isAdminLeadsApiAllowed(request))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);

  try {
    const listWhere = buildWhereFromParams(searchParams, { includeStatusFilter: true });
    const summaryWhere = buildWhereFromParams(searchParams, { includeStatusFilter: false });

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

    const ordered = sortOutboundLeadsByCommercialPriority(rawList as Lead[]);
    const leads = ordered.map((l) => {
      const daysSinceLastContact = daysSinceLastContactAt(l.lastContactAt);
      const forAction = { status: l.status, lastContactAt: l.lastContactAt, name: l.name, company: l.company, phone: l.phone, id: l.id };
      const leadActionState = getLeadActionState(forAction);
      const suggestedAction = getSuggestedAction(forAction, leadActionState);
      return { ...l, daysSinceLastContact, leadActionState, suggestedAction };
    });
    const actionList = pickActionListWithState(leads);
    const { byStatus, conversionMetrics, funnelStageCounts } = buildConversionMetricsFromGroupBy(groupRows);
    const summaryTotal = conversionMetrics.total;

    return NextResponse.json({
      leads,
      actionList,
      summary: {
        byStatus,
        countsByStatus: byStatus,
        funnelStageCounts,
        total: summaryTotal,
        conversionMetrics,
      },
    });
  } catch {
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

  try {
    const lead = await prisma.lead.create({
      data: {
        phone,
        name: name ?? null,
        company: company ?? null,
        notes: notes ?? null,
        origin: origin && origin.length > 0 ? origin : null,
        nextFollowUpAt: nfuP.value,
        ...(status ? { status } : {}),
      },
    });
    return NextResponse.json({ lead }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
