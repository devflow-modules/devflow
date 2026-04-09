import { NextRequest, NextResponse } from "next/server";
import { WaInboxThreadStatus } from "@/generated/prisma-whatsapp";
import { getAuthFromRequest } from "@/modules/auth";
import {
  waInboxCountThreads,
  waInboxListThreads,
  fetchWhatsappLineSummaries,
  type WaInboxConversationPhaseFilter,
} from "@/modules/inbox";

export const dynamic = "force-dynamic";

const VALID_STATUS = new Set<string>(["OPEN", "PENDING", "CLOSED"]);
const VALID_PRIORITY = new Set<string>(["LOW", "MEDIUM", "HIGH"]);
const VALID_PHASE = new Set<string>([
  "needs_response",
  "mine",
  "unassigned",
  "in_attendance",
  "awaiting_customer",
  "closed",
]);

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const take = Math.min(
    Math.max(1, parseInt(searchParams.get("limit") || "50", 10) || 50),
    200
  );
  const skip = Math.max(0, parseInt(searchParams.get("offset") || "0", 10) || 0);
  const statusParam = searchParams.get("status")?.toUpperCase();
  const assignedTo = searchParams.get("assignedTo")?.trim() || undefined;
  const tag = searchParams.get("tag")?.trim() || undefined;
  const priorityParam = searchParams.get("priority")?.toUpperCase();
  const businessPhoneNumberId = searchParams.get("businessPhoneNumberId")?.trim() || undefined;
  const phaseParam = searchParams.get("phase")?.trim().toLowerCase() || undefined;
  const queueIdParam = searchParams.get("queueId")?.trim() || undefined;

  const filters: {
    status?: WaInboxThreadStatus;
    assignedTo?: string;
    tag?: string;
    priority?: string;
    businessPhoneNumberId?: string;
    conversationPhase?: WaInboxConversationPhaseFilter;
    queueId?: string;
  } = {};
  if (phaseParam && VALID_PHASE.has(phaseParam)) {
    filters.conversationPhase = phaseParam as WaInboxConversationPhaseFilter;
  } else {
    if (statusParam && VALID_STATUS.has(statusParam)) filters.status = statusParam as WaInboxThreadStatus;
    if (assignedTo) filters.assignedTo = assignedTo === "me" ? "me" : assignedTo;
  }
  if (tag) filters.tag = tag;
  if (priorityParam && VALID_PRIORITY.has(priorityParam)) filters.priority = priorityParam;
  if (businessPhoneNumberId) filters.businessPhoneNumberId = businessPhoneNumberId;
  if (queueIdParam) {
    filters.queueId = queueIdParam === "none" ? "none" : queueIdParam;
  }

  try {
    const [threads, total] = await Promise.all([
      waInboxListThreads(auth.payload.tenantId, {
        take,
        skip,
        filters: Object.keys(filters).length ? filters : undefined,
        currentUserId: auth.payload.sub,
      }),
      waInboxCountThreads(auth.payload.tenantId, Object.keys(filters).length ? filters : undefined, auth.payload.sub),
    ]);
    const lineMap = await fetchWhatsappLineSummaries(
      auth.payload.tenantId,
      threads.map((t) => t.businessPhoneNumberId)
    );
    const threadsOut = threads.map((t) => ({
      ...t,
      whatsappLine: lineMap.get(t.businessPhoneNumberId) ?? {
        phoneNumberId: t.businessPhoneNumberId,
        label: null,
        displayPhoneNumber: null,
        isPrimary: false,
        isDefaultOutbound: false,
      },
    }));
    return NextResponse.json({
      success: true,
      data: { threads: threadsOut, pagination: { limit: take, offset: skip, total } },
    });
  } catch (e) {
    return NextResponse.json(
      {
        success: false,
        error: { message: e instanceof Error ? e.message : "Erro ao listar" },
      },
      { status: 500 }
    );
  }
}
