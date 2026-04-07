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
import { waInboxCreateOutbound } from "@/modules/inbox/waInboxMessageService";
import type { Action, AutomationContext } from "./automation.types";
import { WaInboxThreadStatus, WaInboxThreadPriority } from "@/generated/prisma-whatsapp";
import { checkTenantAiAutomationReady, runTenantAiAutoReply } from "@/modules/ai/aiAutomationService";
import type { ResolvedTenant } from "@/modules/tenants/tenantService";
import { digitsOnly } from "@/modules/inbox/waInboxUtils";
import { WhatsAppCloudAdapter } from "@devflow/whatsapp-core";
import type { IncomingMessage } from "@devflow/whatsapp-core";

const MAX_DEPTH = 5;
const AUTOMATION_USER_ID = "automation";

async function resolveTenantFromId(tenantId: string): Promise<ResolvedTenant | null> {
  const row = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, phoneNumberId: true, displayPhoneNumber: true, accessToken: true },
  });
  if (!row?.phoneNumberId || !row?.accessToken) return null;
  return {
    id: row.id,
    phoneNumberId: row.phoneNumberId,
    displayPhoneNumber: row.displayPhoneNumber ?? "",
    accessToken: row.accessToken,
  };
}

export function canExecuteMore(context: AutomationContext): boolean {
  return context.depth < MAX_DEPTH;
}

export async function executeAction(
  action: Action,
  context: AutomationContext
): Promise<{ ok: boolean; error?: string }> {
  if (!canExecuteMore(context)) {
    return { ok: false, error: "max_depth_exceeded" };
  }

  try {
    switch (action.type) {
      case "assignConversation": {
        const userId = action.params?.userId as string | undefined;
        if (userId === "auto" || userId === "automation" || !userId) {
          const users = await prisma.user.findMany({
            where: { tenantId: context.tenantId },
            select: { id: true },
            take: 1,
          });
          if (users.length > 0) {
            const ok = await assignThread(
              context.tenantId,
              context.threadId,
              users[0].id
            );
            return { ok };
          }
          return { ok: false, error: "no_user_to_assign" };
        }
        const ok = await assignThread(
          context.tenantId,
          context.threadId,
          userId
        );
        return { ok };
      }

      case "updateStatus": {
        const status = action.params?.status as string | undefined;
        if (!status || !["OPEN", "PENDING", "CLOSED"].includes(status)) {
          return { ok: false, error: "invalid_status" };
        }
        const ok = await updateThreadStatus(
          context.tenantId,
          context.threadId,
          status as WaInboxThreadStatus
        );
        return { ok };
      }

      case "addTag": {
        const tagId = action.params?.tagId as string | undefined;
        const tagName = action.params?.tagName as string | undefined;
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
        const tagId = action.params?.tagId as string | undefined;
        const tagName = action.params?.tagName as string | undefined;
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
        const priority = action.params?.priority as string | undefined;
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
        const text = action.params?.text as string | undefined;
        if (!text?.trim()) return { ok: false, error: "empty_text" };
        const thread = await prisma.waInboxThread.findFirst({
          where: { id: context.threadId, tenantId: context.tenantId },
          include: { tenant: true },
        });
        if (!thread?.tenant?.accessToken || !thread.tenant.phoneNumberId) {
          return { ok: false, error: "whatsapp_not_configured" };
        }
        const adapter = new WhatsAppCloudAdapter({
          accessToken: thread.tenant.accessToken,
        });
        const to = thread.phoneNumber.replace(/\D/g, "");
        const { messageId } = await adapter.sendText(thread.tenant.phoneNumberId, {
          to,
          text: text.trim(),
        });
        await waInboxCreateOutbound({
          tenantId: context.tenantId,
          customerPhoneDigits: to,
          waMessageId: messageId,
          text: text.trim(),
          businessDigits: digitsOnly(thread.tenant.displayPhoneNumber ?? ""),
          outboundKind: "automation",
        });
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
        const tenant = await resolveTenantFromId(context.tenantId);
        if (!tenant) return { ok: false, error: "tenant_not_resolved" };
        const thread = await prisma.waInboxThread.findFirst({
          where: { id: context.threadId, tenantId: context.tenantId },
          select: { phoneNumber: true },
        });
        if (!thread) return { ok: false, error: "thread_not_found" };
        const customerPhone = thread.phoneNumber;
        const ready = await checkTenantAiAutomationReady(
          context.tenantId,
          customerPhone
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
            conversationId: context.threadId,
            textBody: context.messageText ?? "...",
          });
        } catch (e) {
          return { ok: false, error: String(e instanceof Error ? e.message : e) };
        }
        return { ok: true };
      }

      case "logAction": {
        const note =
          (action.params?.message as string) ??
          (action.params?.note as string) ??
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
    console.error("[automation] action failed", action.type, context.threadId, msg);
    return { ok: false, error: msg };
  }
}
