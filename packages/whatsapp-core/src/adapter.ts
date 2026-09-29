/**
 * Adapter para WhatsApp Cloud API (envio, marcar como lida).
 * Não contém lógica de tenant; recebe token e phoneNumberId por chamada.
 *
 * Retry: apenas 429 / 5xx. Timeout e falha de rede são MetaApiError(ambiguous_no_retry)
 * — a Meta pode já ter aceite; o caller (ledger) decide UNKNOWN_OUTCOME, não resend cego.
 */

import { retryWithBackoff } from "./retry";
import {
  MetaApiError,
  classifyMetaFetchFailure,
  classifyMetaHttpStatus,
} from "./metaErrors";
import type { SendTextOptions } from "./types";

export interface WhatsAppCloudAdapterConfig {
  accessToken: string;
  baseUrl?: string;
}

const DEFAULT_VERSION = "v21.0";

function getGraphBaseUrl(): string {
  const version =
    process.env.META_API_VERSION ?? process.env.WHATSAPP_API_VERSION ?? DEFAULT_VERSION;
  const v = version.startsWith("v") ? version : `v${version}`;
  return `https://graph.facebook.com/${v}`;
}

export class WhatsAppCloudAdapter {
  constructor(private readonly config: WhatsAppCloudAdapterConfig) {}

  private get baseUrl(): string {
    return this.config.baseUrl ?? getGraphBaseUrl();
  }

  async sendText(phoneNumberId: string, options: SendTextOptions): Promise<{ messageId: string }> {
    return retryWithBackoff(async () => {
      let res: Response;
      try {
        res = await fetch(`${this.baseUrl}/${phoneNumberId}/messages`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.config.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: options.to.replace(/\D/g, ""),
            type: "text",
            text: {
              body: options.text,
              preview_url: options.previewUrl ?? false,
            },
          }),
        });
      } catch (err) {
        const { kind, decision } = classifyMetaFetchFailure(err);
        throw new MetaApiError({
          message: err instanceof Error ? err.message : String(err),
          kind,
          decision,
        });
      }

      if (!res.ok) {
        const errBody = await res.text();
        const classified = classifyMetaHttpStatus(res.status, res.headers.get("retry-after"));
        console.error("[WHATSAPP][DEBUG] Graph API error", {
          status: res.status,
          statusText: res.statusText,
          kind: classified.kind,
          decision: classified.decision,
          body: errBody.slice(0, 500),
        });
        throw new MetaApiError({
          message: `WhatsApp API error ${res.status}: ${errBody.slice(0, 300)}`,
          kind: classified.kind,
          decision: classified.decision,
          httpStatus: res.status,
          retryAfterMs: classified.retryAfterMs,
        });
      }

      const data = (await res.json()) as { messages?: Array<{ id: string }> };
      const messageId = data.messages?.[0]?.id ?? "";
      console.log("[WHATSAPP][DEBUG] Graph API send success", {
        messageId: messageId || "(empty)",
        to: options.to.replace(/\D/g, "").slice(0, 6) + "***",
      });
      return { messageId };
    });
  }

  async markAsRead(phoneNumberId: string, messageId: string): Promise<void> {
    await fetch(`${this.baseUrl}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        status: "read",
        message_id: messageId,
      }),
    });
  }
}
