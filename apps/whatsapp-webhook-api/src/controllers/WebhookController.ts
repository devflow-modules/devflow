import type { Request, Response } from "express";
import { normalizeWebhookPayload } from "@devflow/whatsapp-core";
import type { IncomingMessage } from "@devflow/whatsapp-core";
import { tenantService } from "../services/TenantService.js";
import { conversationService } from "../services/ConversationService.js";
import { aiService } from "../services/AIService.js";
import { whatsAppService } from "../services/WhatsAppService.js";
import { messageService } from "../services/MessageService.js";

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN ?? "";

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
      console.error("[Webhook] Tenant not found for phone_number_id:", phoneNumberId);
      return;
    }

    for (const msg of payload.messages) {
      const extracted = extractTextContent(msg);
      if (!extracted) continue;

      const from = msg.from;
      const messageTimestamp = msg.timestamp ? new Date(Number(msg.timestamp) * 1000) : undefined;

      try {
        const context = await conversationService.processInbound({
          tenantId: tenant.id,
          externalId: from,
          sender: "user",
          messageType: extracted.messageType,
          content: extracted.content,
          messageTimestamp,
        });

        const { intent } = await aiService.classifyIntent(extracted.content);
        const payload = await aiService.generateResponse(intent, extracted.content, {
          recentMessages: context.recentMessages,
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

        await messageService.create({
          conversationId: context.conversationId,
          sender: "business",
          messageType: "text",
          content: responseText,
          timestamp: new Date(),
        });
      } catch (err) {
        console.error("[Webhook] Error processing message:", err);
      }
    }
  }
}

export const webhookController = new WebhookController();
