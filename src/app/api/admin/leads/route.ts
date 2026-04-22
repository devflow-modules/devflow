import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma-root";
import { isAdminLeadsApiAllowed } from "@/lib/admin-leads-api-auth";
import { sortOutboundLeadsByCommercialPriority } from "@/lib/admin-outbound-leads";

const createLeadSchema = z.object({
  name: z.string().trim().max(200).optional().nullable(),
  company: z.string().trim().max(200).optional().nullable(),
  phone: z.string().trim().min(3).max(40),
  status: z.string().trim().max(80).optional(),
  notes: z.string().trim().max(10_000).optional().nullable(),
  origin: z.string().trim().max(120).optional().nullable(),
  nextFollowUpAt: z.string().max(80).optional().nullable(),
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
  if (isOverdueFollowUpParam(searchParams.get("overdueFollowUp"))) {
    const now = new Date();
    parts.push({
      nextFollowUpAt: { not: null, lt: now },
    });
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

    const leads = sortOutboundLeadsByCommercialPriority(rawList);
    const summaryByStatus: Record<string, number> = {};
    for (const row of groupRows) {
      summaryByStatus[row.status] = row._count._all;
    }
    const summaryTotal = Object.values(summaryByStatus).reduce((a, b) => a + b, 0);

    return NextResponse.json({ leads, summary: { byStatus: summaryByStatus, total: summaryTotal } });
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
