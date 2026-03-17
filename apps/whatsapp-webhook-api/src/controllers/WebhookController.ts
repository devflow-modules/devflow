import type { Request, Response } from "express";
import { normalizeWebhookPayload } from "@devflow/whatsapp-core";
import type { IncomingMessage } from "@devflow/whatsapp-core";
import { tenantService } from "../services/TenantService.js";
import { conversationService } from "../services/ConversationService.js";
import { aiService } from "../services/AIService.js";
import { whatsAppService } from "../services/WhatsAppService.js";
import { messageService } from "../services/MessageService.js";
import { queueService } from "../services/QueueService.js";

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN ?? "";

function logStructured(obj: Record<string, unknown>): void {
  console.log(JSON.stringify({ ts: new Date().toISOString(), ...obj }));
}

async function notifyCrmIfLead(
  tenant: { id: string; crmWebhookUrl?: string | null },
  phone: string,
  message: string,
  intent: string
): Promise<void> {
  if (!tenant.crmWebhookUrl?.trim() || intent !== "SALES") return;
  try {
    await fetch(tenant.crmWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenantId: tenant.id,
        phone,
        message,
        intent,
        source: "whatsapp",
      }),
    });
  } catch (e) {
    console.error("[Webhook] CRM webhook failed:", e);
  }
}

function extractTextContent(msg: IncomingMessage): { messageType: string; content: string } | null {
  if (msg.type === "text" && (msg as { text?: { body?: string } }).text?.body) {
    return {
      messageType: "text",
      content: (msg as { text: { body: string } }).text.body,
    };
  }
  if (msg.type === "reaction" && (msg as { reaction?: { emoji?: string } }).reaction?.emoji) {
    return {
      messageType: "reaction",
      content: (msg as { reaction: { emoji: string } }).reaction.emoji,
    };
  }
  return null;
}

export class WebhookController {
  handleVerify(req: Request, res: Response): void {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      res.status(200).send(challenge);
      return;
    }
    res.status(403).send("Forbidden");
  }

  async handleWebhook(req: Request, res: Response): Promise<void> {
    res.status(200).send("OK");

    void this.processPayload(req.body);
  }

  private async processPayload(body: unknown): Promise<void> {
    const payload = normalizeWebhookPayload(body);
    if (!payload || payload.messages.length === 0) return;

    const phoneNumberId = payload.phoneNumberId;
    const tenant = await tenantService.resolveTenant({ phoneNumberId });
    if (!tenant) {
      logStructured({ event: "webhook.tenant_not_found", phoneNumberId });
      return;
    }

    for (const msg of payload.messages) {
      const extracted = extractTextContent(msg);
      if (!extracted) continue;

      const from = msg.from;
      const messageTimestamp = msg.timestamp ? new Date(Number(msg.timestamp) * 1000) : undefined;

      try {
        const userMessageTime = messageTimestamp ?? new Date();
        const context = await conversationService.processInbound({
          tenantId: tenant.id,
          externalId: from,
          sender: "user",
          messageType: extracted.messageType,
          content: extracted.content,
          messageTimestamp,
        });

        logStructured({
          event: "webhook.inbound",
          tenantId: tenant.id,
          conversationId: context.conversationId,
          from,
        });

        if (extracted.messageType === "image" || extracted.messageType === "document") {
          continue;
        }

        const aiOptions = { tenantId: tenant.id, driver: tenant.aiDriver as "ruleBased" | "openAI" | "claude" | undefined };
        const { intent } = await aiService.classifyIntent(extracted.content, aiOptions);
        await notifyCrmIfLead(tenant, from, extracted.content, intent);
        const payload = await aiService.generateResponse(intent, extracted.content, {
          recentMessages: context.recentMessages,
        }, aiOptions);

        const responseSource = tenant.aiDriver && (tenant.aiDriver === "openAI" || tenant.aiDriver === "claude") ? "ai" : "ruleBased";
        logStructured({
          event: "webhook.response",
          tenantId: tenant.id,
          conversationId: context.conversationId,
          intent,
          escalate: payload.escalate,
          responseSource,
        });

        const responseText = payload.escalate
          ? `${payload.response}\n\n_Um atendente pode entrar em contato em breve._`
          : payload.response;

        await whatsAppService.sendTextMessage({
          phoneNumberId: tenant.phoneNumberId,
          accessToken: tenant.accessToken,
          to: from,
          text: responseText,
        });

        const now = new Date();
        const responseTimeMs = Math.round(now.getTime() - userMessageTime.getTime());
        await messageService.create({
          conversationId: context.conversationId,
          sender: "business",
          messageType: "text",
          content: responseText,
          timestamp: now,
          responseTimeMs,
          intent,
        });

        if (payload.escalate) {
          logStructured({
            event: "webhook.escalated",
            tenantId: tenant.id,
            conversationId: context.conversationId,
          });
          await queueService.enqueue({
            tenantId: tenant.id,
            conversationId: context.conversationId,
            priority: 0,
          }).catch((e) => {
            logStructured({ event: "webhook.enqueue_failed", tenantId: tenant.id, conversationId: context.conversationId, error: String(e) });
          });
          const availableAgent = await queueService.findAvailableAgent(tenant.id).catch(() => null);
          if (availableAgent) {
            logStructured({
              event: "webhook.assign",
              tenantId: tenant.id,
              conversationId: context.conversationId,
              userId: availableAgent.userId,
            });
            await queueService.assignConversationToAgent(tenant.id, context.conversationId, availableAgent.userId).catch((e) => {
              logStructured({ event: "webhook.assign_failed", tenantId: tenant.id, conversationId: context.conversationId, error: String(e) });
            });
          }
        }
      } catch (err) {
        logStructured({
          event: "webhook.error",
          tenantId: tenant.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }
}

export const webhookController = new WebhookController();
