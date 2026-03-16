import { WhatsAppCloudAdapter } from "@devflow/whatsapp-core";

export type SendTextParams = {
  phoneNumberId: string;
  accessToken: string;
  to: string;
  text: string;
};

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
}

export const whatsAppService = new WhatsAppService();
