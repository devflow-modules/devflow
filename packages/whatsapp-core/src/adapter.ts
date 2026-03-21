/**
 * Adapter para WhatsApp Cloud API (envio, marcar como lida).
 * Não contém lógica de tenant; recebe token e phoneNumberId por chamada.
 */

import { retryWithBackoff } from "./retry";
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
      const res = await fetch(`${this.baseUrl}/${phoneNumberId}/messages`, {
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
      if (!res.ok) {
        const err = await res.text();
        console.error("[WHATSAPP][DEBUG] Graph API error", {
          status: res.status,
          statusText: res.statusText,
          body: err.slice(0, 500),
        });
        throw new Error(`WhatsApp API error ${res.status}: ${err}`);
      }
      const data = (await res.json()) as { messages?: Array<{ id: string }> };
      const messageId = data.messages?.[0]?.id ?? "";
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
