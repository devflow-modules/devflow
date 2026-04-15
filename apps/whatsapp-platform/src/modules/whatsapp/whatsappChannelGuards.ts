import {
  WhatsappPhoneNumberStatus,
  type WhatsappPhoneNumber,
} from "@/generated/prisma-whatsapp";

export function isWhatsappLineReadyForOutbound(row: {
  status: WhatsappPhoneNumberStatus;
  accessToken: string | null;
}): boolean {
  return row.status === WhatsappPhoneNumberStatus.ACTIVE && Boolean(row.accessToken?.trim());
}

export function assertWhatsappPhoneNumberSendable(row: WhatsappPhoneNumber | null): void {
  if (!row) {
    const e = new Error("CHANNEL_NOT_CONFIGURED");
    e.name = "ChannelSendError";
    throw e;
  }
  if (!isWhatsappLineReadyForOutbound(row)) {
    const e = new Error("CHANNEL_NOT_ACTIVE");
    e.name = "ChannelSendError";
    throw e;
  }
}
