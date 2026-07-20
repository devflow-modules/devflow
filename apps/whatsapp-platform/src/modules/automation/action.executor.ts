/**
 * Executor de ações de automação.
 * Garante tenant isolation, evita loops e registra no audit.
 */

import { prisma } from "@/lib/prisma";
import {
  assignThread,
  updateThreadStatus,
  assignTagToThread,
  removeTagFromThread,
  logAction,
} from "@/modules/inbox";
import type { Action, AutomationContext, ActionType } from "./automation.types";
import { WaInboxThreadStatus, WaInboxThreadPriority } from "@/generated/prisma-whatsapp";
import { checkTenantAiAutomationReady, runTenantAiAutoReply } from "@/modules/ai/aiAutomationService";
import type { ResolvedTenant } from "@/modules/tenants";
import { resolveMessagingTenantForOutbound } from "@/modules/whatsapp/whatsappPhoneResolution";
import type { IncomingMessage } from "@devflow/whatsapp-core";
import { sendWebhookAutoReply } from "@/modules/messaging/sendMessageService";

const MAX_DEPTH = 5;
const AUTOMATION_USER_ID = "automation";

async function resolveTenantFromId(
  tenantId: string,
  businessPhoneNumberId: string | null | undefined
): Promise<ResolvedTenant | null> {
  return resolveMessagingTenantForOutbound(tenantId, businessPhoneNumberId);
}

export function canExecuteMore(context: AutomationContext): boolean {
  return context.depth < MAX_DEPTH;
}

function normalizeAutomationAction(action: Action): Action {
  const t = action.type as string;
  if (t === "assign_to_user") return { type: "assignConversation", params: action.params };
  if (t === "add_tag") return { type: "addTag", params: action.params };
  if (t === "send_message") {
    const mode = action.params?.mode as string | undefined;
    if (mode === "ai") return { type: "triggerAIResponse", params: action.params };
    return {
      type: "sendMessage",
      params: { text: String(action.params?.text ?? "") },
    };
  }
  return action;
}

export async function executeAction(
  action: Action,
  context: AutomationContext
): Promise<{ ok: boolean; error?: string }> {
  if (!canExecuteMore(context)) {
    return { ok: false, error: "max_depth_exceeded" };
  }

  const normalized = normalizeAutomationAction(action);
  const effectiveType = normalized.type as ActionType;

  try {
    switch (effectiveType) {
      case "notify": {
        const title = String(normalized.params?.title ?? "Automação");
        const body = String(
          normalized.params?.body ?? normalized.params?.message ?? ""
        );
        await logAction(context.tenantId, context.threadId, AUTOMATION_USER_ID, "notify", {
          title,
          body,
        });
        return { ok: true };
      }

      case "assignConversation": {
        const userId = normalized.params?.userId as string | undefined;
        if (userId === "auto" || userId === "automation" || !userId) {
          return { ok: false, error: "automatic_assignment_not_configured" };
        }
        const result = await assignThread(
          context.tenantId,
          context.threadId,
          userId,
          "automation",
          "system"
        );
        return { ok: result.ok, ...(result.ok ? {} : { error: result.reason }) };
      }

      case "updateStatus": {
        const status = normalized.params?.status as string | undefined;
        if (!status || !["OPEN", "PENDING", "CLOSED"].includes(status)) {
          return { ok: false, error: "invalid_status" };
        }
        const result = await updateThreadStatus(
          context.tenantId,
          context.threadId,
          status as WaInboxThreadStatus
        );
        return { ok: result.ok, ...(result.ok ? {} : { error: result.reason }) };
      }

      case "addTag": {
        const tagId = normalized.params?.tagId as string | undefined;
        const tagName = normalized.params?.tagName as string | undefined;
        let resolvedTagId = tagId;
        if (!resolvedTagId && tagName) {
          const tag = await prisma.waInboxTag.findFirst({
            where: { tenantId: context.tenantId, name: tagName },
            select: { id: true },
          });
          resolvedTagId = tag?.id;
        }
        if (!resolvedTagId) return { ok: false, error: "tag_not_found" };
        const ok = await assignTagToThread(
          context.tenantId,
          context.threadId,
          resolvedTagId
        );
        return { ok };
      }

      case "removeTag": {
        const tagId = normalized.params?.tagId as string | undefined;
        const tagName = normalized.params?.tagName as string | undefined;
        let resolvedTagId = tagId;
        if (!resolvedTagId && tagName) {
          const tag = await prisma.waInboxTag.findFirst({
            where: { tenantId: context.tenantId, name: tagName },
            select: { id: true },
          });
          resolvedTagId = tag?.id;
        }
        if (!resolvedTagId) return { ok: false, error: "tag_not_found" };
        const ok = await removeTagFromThread(
          context.tenantId,
          context.threadId,
          resolvedTagId
        );
        return { ok };
      }

      case "setPriority": {
        const priority = normalized.params?.priority as string | undefined;
        if (!priority || !["LOW", "MEDIUM", "HIGH"].includes(priority)) {
          return { ok: false, error: "invalid_priority" };
        }
        await prisma.waInboxThread.updateMany({
          where: { id: context.threadId, tenantId: context.tenantId },
          data: { priority: priority as WaInboxThreadPriority },
        });
        await logAction(
          context.tenantId,
          context.threadId,
          AUTOMATION_USER_ID,
          "priority_change",
          { priority }
        );
        return { ok: true };
      }

      case "sendMessage": {
        const text = normalized.params?.text as string | undefined;
        if (!text?.trim()) return { ok: false, error: "empty_text" };
        const thread = await prisma.waInboxThread.findFirst({
          where: { id: context.threadId, tenantId: context.tenantId },
          select: { phoneNumber: true, businessPhoneNumberId: true },
        });
        if (!thread) return { ok: false, error: "thread_not_found" };
        const messagingTenant = await resolveMessagingTenantForOutbound(
          context.tenantId,
          thread.businessPhoneNumberId
        );
        if (!messagingTenant) {
          return { ok: false, error: "whatsapp_not_configured" };
        }
        const to = thread.phoneNumber.replace(/\D/g, "");
        const sendResult = await sendWebhookAutoReply({
          tenant: messagingTenant,
          to,
          text: text.trim(),
          inboxThreadId: context.threadId,
          outboundKind: "automation",
          automaticTrigger:
            context.messageId && !String(context.messageId).startsWith("auto-")
              ? {
                  inboundWaMessageId: context.messageId,
                  triggerSource: "automation",
                }
              : undefined,
        });
        if (!sendResult.ok) {
          return { ok: false, error: `automatic_send_blocked:${sendResult.reason}` };
        }
        await logAction(
          context.tenantId,
          context.threadId,
          AUTOMATION_USER_ID,
          "message_send",
          { source: "automation", textLength: text.length }
        );
        return { ok: true };
      }

      case "triggerAIResponse": {
        const thread = await prisma.waInboxThread.findFirst({
          where: { id: context.threadId, tenantId: context.tenantId },
          select: { phoneNumber: true, businessPhoneNumberId: true },
        });
        if (!thread) return { ok: false, error: "thread_not_found" };
        const tenant = await resolveTenantFromId(context.tenantId, thread.businessPhoneNumberId);
        if (!tenant) return { ok: false, error: "tenant_not_resolved" };
        const customerPhone = thread.phoneNumber;
        const ready = await checkTenantAiAutomationReady(
          context.tenantId,
          customerPhone,
          thread.businessPhoneNumberId
        );
        if (!ready.ready) {
          return { ok: false, error: `ai_not_ready:${ready.reason}` };
        }
        const fakeMessage: IncomingMessage = {
          from: customerPhone,
          type: "text",
          text: { body: context.messageText ?? "..." },
          id: context.messageId ?? `auto-${Date.now()}`,
          timestamp: String(Math.floor(Date.now() / 1000)),
        };
        try {
          await runTenantAiAutoReply({
            tenant,
            message: fakeMessage,
            inboxThreadId: context.threadId,
            textBody: context.messageText ?? "...",
          });
        } catch (e) {
          return { ok: false, error: String(e instanceof Error ? e.message : e) };
        }
        return { ok: true };
      }

      case "logAction": {
        const note =
          (normalized.params?.message as string) ??
          (normalized.params?.note as string) ??
          "automation";
        await logAction(
          context.tenantId,
          context.threadId,
          AUTOMATION_USER_ID,
          "automation_log",
          { note }
        );
        return { ok: true };
      }

      default:
        return { ok: false, error: "unknown_action" };
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[automation] action failed", effectiveType, context.threadId, msg);
    return { ok: false, error: msg };
  }
}
