import { WhatsAppCloudAdapter } from "@devflow/whatsapp-core";
import { prisma } from "@/lib/prisma-root";
import { createOutboundMessage } from "@/modules/whatsapp-inbox/whatsappInbox.message.service";
import { loadMetaOnboardingEnv } from "@/modules/whatsapp-onboarding/whatsappOnboarding.env";
import { parseMetaApiError } from "./whatsappMessaging.errors";
import { maskPhoneForLog } from "./whatsappMessaging.logger";
import type { SendTextBody } from "./whatsappMessaging.schemas";
import type { SendTextMessageResult } from "./whatsappMessaging.types";

function graphBase(version: string): string {
  const v = version.startsWith("v") ? version : "v" + version;
  return "https://graph.facebook.com/" + v;
}

export async function sendTextMessage(input: SendTextBody): Promise<SendTextMessageResult> {
  const env = loadMetaOnboardingEnv();
  const token = env.effectiveAccessToken;
  const phoneNumberId = env.META_PHONE_NUMBER_ID ? env.META_PHONE_NUMBER_ID.trim() : undefined;

  if (!token) {
    return {
      success: false,
      messageId: null,
      metaResponseSummary: null,
      idempotent: false,
      errorCode: "TOKEN_MISSING",
      errorMessage: "META_SYSTEM_USER_TOKEN ou WHATSAPP_ACCESS_TOKEN ausente",
      httpStatus: null,
    };
  }
  if (!phoneNumberId) {
    return {
      success: false,
      messageId: null,
      metaResponseSummary: null,
      idempotent: false,
      errorCode: "PHONE_NUMBER_ID_MISSING",
      errorMessage: "META_PHONE_NUMBER_ID ausente",
      httpStatus: null,
    };
  }

  const adapter = new WhatsAppCloudAdapter({
    accessToken: token,
    baseUrl: graphBase(env.META_API_VERSION),
  });

  console.log(
    JSON.stringify({
      scope: "whatsapp_send_text",
      toMasked: maskPhoneForLog(input.to),
      previewUrl: input.preview_url,
      ts: new Date().toISOString(),
    })
  );

  try {
    const out = await adapter.sendText(phoneNumberId, {
      to: input.to.replace(/\D/g, ""),
      text: input.text,
      previewUrl: input.preview_url,
    });
    if (out.messageId) {
      try {
        await createOutboundMessage(prisma, {
          waMessageId: out.messageId,
          toE164: input.to,
          text: input.text,
          rawPayload: { preview_url: input.preview_url },
        });
      } catch (persistErr) {
        console.error("[whatsapp-messaging] createOutboundMessage", persistErr);
      }
    }
    return {
      success: true,
      messageId: out.messageId || null,
      metaResponseSummary: "messages accepted",
      idempotent: false,
      errorCode: null,
      errorMessage: null,
      httpStatus: 200,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const m = msg.match(/WhatsApp API error (\d+):\s*([\s\S]*)/);
    const status = m ? parseInt(m[1], 10) : 0;
    const body = m ? m[2] : msg;
    const parsed = parseMetaApiError(status || 500, body);
    return {
      success: false,
      messageId: null,
      metaResponseSummary: parsed.fbtraceId ? "fbtrace_id=" + parsed.fbtraceId : null,
      idempotent: false,
      errorCode: parsed.code,
      errorMessage: parsed.message,
      httpStatus: status || null,
    };
  }
}
