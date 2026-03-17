import { WhatsAppCloudAdapter } from "@devflow/whatsapp-core";

export type SendTextParams = {
  phoneNumberId: string;
  accessToken: string;
  to: string;
  text: string;
};

export type SendImageParams = {
  phoneNumberId: string;
  accessToken: string;
  to: string;
  imageIdOrUrl: string;
  caption?: string;
};

const DEFAULT_BASE = "https://graph.facebook.com/v21.0";

export class WhatsAppService {
  sendTextMessage(params: SendTextParams): Promise<{ messageId: string }> {
    const adapter = new WhatsAppCloudAdapter({
      accessToken: params.accessToken,
    });
    return adapter.sendText(params.phoneNumberId, {
      to: params.to,
      text: params.text,
    });
  }

  async sendImage(params: SendImageParams): Promise<{ messageId: string }> {
    const to = params.to.replace(/\D/g, "");
    const isUrl = params.imageIdOrUrl.startsWith("http");
    const body = isUrl
      ? {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to,
          type: "image",
          image: {
            link: params.imageIdOrUrl,
            caption: params.caption ?? undefined,
          },
        }
      : {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to,
          type: "image",
          image: {
            id: params.imageIdOrUrl,
            caption: params.caption ?? undefined,
          },
        };
    const res = await fetch(`${DEFAULT_BASE}/${params.phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`WhatsApp API image error ${res.status}: ${err}`);
    }
    const data = (await res.json()) as { messages?: Array<{ id: string }> };
    return { messageId: data.messages?.[0]?.id ?? "" };
  }
}

export const whatsAppService = new WhatsAppService();
