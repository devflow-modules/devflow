import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma-root";
import { isAdminLeadsApiAllowed } from "@/lib/admin-leads-api-auth";

const patchLeadSchema = z.object({
  name: z.string().trim().max(200).optional().nullable(),
  company: z.string().trim().max(200).optional().nullable(),
  phone: z.string().trim().min(3).max(40).optional(),
  status: z.string().trim().max(80).optional(),
  notes: z.string().trim().max(10_000).optional().nullable(),
  origin: z.string().trim().max(120).optional().nullable(),
  nextFollowUpAt: z.union([z.string().max(100), z.null()]).optional(),
  conversationRef: z.string().trim().max(200).optional().nullable(),
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
    data.conversationRef === undefined
  ) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const nfu = parseNextFollowUp(data.nextFollowUpAt);
  if (nfu === "invalid") {
    return NextResponse.json({ error: "nextFollowUpAt inválido" }, { status: 400 });
  }

  try {
    const current = await prisma.lead.findUnique({ where: { id } });
    if (!current) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const statusChanged = data.status !== undefined && data.status !== current.status;

    const lead = await prisma.lead.update({
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
        ...(statusChanged ? { lastContactAt: new Date() } : {}),
      },
    });
    return NextResponse.json({ lead });
  } catch (e: unknown) {
    const code = typeof e === "object" && e !== null && "code" in e ? (e as { code?: string }).code : undefined;
    if (code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
