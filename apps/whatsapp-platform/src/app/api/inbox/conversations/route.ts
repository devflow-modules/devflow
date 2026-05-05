import { NextRequest } from "next/server";
import { WaInboxThreadStatus } from "@/generated/prisma-whatsapp";
import { getAuthFromRequest } from "@/modules/auth";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import {
  waInboxCountThreads,
  waInboxListThreads,
  fetchWhatsappLineSummaries,
  type WaInboxConversationPhaseFilter,
} from "@/modules/inbox";
import { isInboxProspectLens, type InboxProspectLens } from "@/modules/inbox/inboxProspectLens";
import { isDevFlowProspectingEnabled } from "@/lib/devflowProspecting";

export const dynamic = "force-dynamic";

const VALID_STATUS = new Set<string>(["OPEN", "PENDING", "CLOSED"]);
const VALID_PRIORITY = new Set<string>(["LOW", "MEDIUM", "HIGH"]);
const VALID_PHASE = new Set<string>([
  "all",
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
    return jsonError("UNAUTHORIZED", "Não autorizado", 401);
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
  const prospectLensParam = searchParams.get("prospectLens")?.trim() || undefined;
  const fromDay = searchParams.get("from")?.trim();
  const toDay = searchParams.get("to")?.trim();
  const searchQ = searchParams.get("q")?.trim().slice(0, 120) || undefined;

  const filters: {
    status?: WaInboxThreadStatus;
    assignedTo?: string;
    tag?: string;
    priority?: string;
    businessPhoneNumberId?: string;
    conversationPhase?: WaInboxConversationPhaseFilter;
    queueId?: string;
    prospectLens?: InboxProspectLens;
    lastMessageAtGte?: string;
    lastMessageAtLte?: string;
    search?: string;
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
  if (prospectLensParam && isInboxProspectLens(prospectLensParam)) {
    if (isDevFlowProspectingEnabled(auth.payload.role)) {
      filters.prospectLens = prospectLensParam;
    }
  }
  if (fromDay && /^\d{4}-\d{2}-\d{2}$/.test(fromDay)) {
    filters.lastMessageAtGte = `${fromDay}T00:00:00.000Z`;
  }
  if (toDay && /^\d{4}-\d{2}-\d{2}$/.test(toDay)) {
    filters.lastMessageAtLte = `${toDay}T23:59:59.999Z`;
  }
  if (searchQ) {
    filters.search = searchQ;
  }

  try {
    const effectiveFilters = Object.keys(filters).length ? filters : undefined;
    let threads: Awaited<ReturnType<typeof waInboxListThreads>> = [];
    let total = 0;
    try {
      threads = await waInboxListThreads(auth.payload.tenantId, {
        take,
        skip,
        filters: effectiveFilters,
        currentUserId: auth.payload.sub,
      });
      total = await waInboxCountThreads(auth.payload.tenantId, effectiveFilters, auth.payload.sub);
    } catch (phaseError) {
      if (!filters.conversationPhase) throw phaseError;
      const fallbackFilters = { ...filters };
      delete fallbackFilters.conversationPhase;
      delete fallbackFilters.prospectLens;
      const degradedFilters = Object.keys(fallbackFilters).length ? fallbackFilters : undefined;
      threads = await waInboxListThreads(auth.payload.tenantId, {
        take,
        skip,
        filters: degradedFilters,
        currentUserId: auth.payload.sub,
      });
      total = await waInboxCountThreads(auth.payload.tenantId, degradedFilters, auth.payload.sub);
      console.warn("[inbox] phase query degraded to fallback list", {
        tenantId: auth.payload.tenantId,
        userId: auth.payload.sub,
        phase: filters.conversationPhase,
        phaseError: phaseError instanceof Error ? phaseError.message : phaseError,
      });
    }

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
        status: "ACTIVE",
        purpose: "GENERAL",
      },
    }));
    return jsonSuccess({
      threads: threadsOut,
      pagination: { limit: take, offset: skip, total },
    });
  } catch (e) {
    console.error("[inbox] failed to list conversations", {
      tenantId: auth.payload.tenantId,
      userId: auth.payload.sub,
      limit: take,
      offset: skip,
      filters,
      error: e instanceof Error ? e.message : e,
      stack: e instanceof Error ? e.stack : undefined,
    });
    return jsonError(
      "INBOX_LIST_FAILED",
      "Não foi possível carregar as conversas",
      500
    );
  }
}
