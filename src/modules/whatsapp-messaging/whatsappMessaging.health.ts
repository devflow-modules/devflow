import { prisma } from "@/lib/prisma-root";
import { getInboxPersistenceHealth } from "@/modules/whatsapp-inbox";
import { loadMetaOnboardingEnv } from "@/modules/whatsapp-onboarding/whatsappOnboarding.env";
import { getOnboardingStateRepository } from "@/modules/whatsapp-onboarding/whatsappOnboarding.persistence";
import {
  MessagingBlockedReason,
  type MessagingBlockedReasonType,
  type MessagingHealthPayload,
} from "./whatsappMessaging.types";

async function probeGet(url: string, token: string): Promise<number> {
  try {
    const r = await fetch(url, {
      method: "GET",
      headers: { Authorization: "Bearer " + token },
      signal: AbortSignal.timeout(12_000),
    });
    return r.status;
  } catch {
    return 0;
  }
}

export async function getMessagingHealth(): Promise<MessagingHealthPayload> {
  const env = loadMetaOnboardingEnv();
  const ver = env.META_API_VERSION.startsWith("v")
    ? env.META_API_VERSION
    : "v" + env.META_API_VERSION;
  const base = "https://graph.facebook.com/" + ver;
  const token = env.effectiveAccessToken;
  const phoneId = env.META_PHONE_NUMBER_ID ? env.META_PHONE_NUMBER_ID.trim() : "";
  const verifyConfigured = !!(env.WHATSAPP_VERIFY_TOKEN && env.WHATSAPP_VERIFY_TOKEN.trim());
  const wabaId = env.META_WABA_ID ? env.META_WABA_ID.trim() : "";

  let phoneProbeStatus: number | null = null;
  let wabaProbeStatus: number | null = null;
  let persistedRegistered: boolean | null = null;
  let blockedReason: MessagingBlockedReasonType = MessagingBlockedReason.NONE;
  let registrationBlocksSend = false;

  let phoneNumberIdOk = false;
  let tokenOk = false;
  let st = 0;

  if (!token) {
    blockedReason = MessagingBlockedReason.TOKEN_MISSING;
  } else if (!phoneId) {
    blockedReason = MessagingBlockedReason.PHONE_NUMBER_ID_MISSING;
  } else {
    st = await probeGet(base + "/" + phoneId + "?fields=id", token);
    phoneProbeStatus = st;
    phoneNumberIdOk = st === 200;
    if (st === 401) {
      blockedReason = MessagingBlockedReason.TOKEN_INVALID;
    } else if (st === 403) {
      blockedReason = MessagingBlockedReason.META_PERMISSION_DENIED;
    } else if (st === 404) {
      blockedReason = MessagingBlockedReason.PHONE_NUMBER_ID_MISSING;
    } else if (st >= 500 || st === 0) {
      blockedReason = MessagingBlockedReason.META_API_ERROR;
    } else if (!phoneNumberIdOk) {
      blockedReason = MessagingBlockedReason.META_API_ERROR;
    }
    tokenOk = st === 200 || (st !== 401 && st !== 403 && st !== 404 && st > 0 && st < 500);
  }

  if (token && phoneId && wabaId && phoneNumberIdOk) {
    try {
      const row = await getOnboardingStateRepository().findByWabaAndPhone(wabaId, phoneId);
      if (row) {
        persistedRegistered = !!row.registeredAt;
        if (!row.registeredAt) {
          blockedReason = MessagingBlockedReason.PHONE_NUMBER_NOT_REGISTERED;
          registrationBlocksSend = true;
        }
      }
    } catch {
      persistedRegistered = null;
    }
  }

  if (
    blockedReason === MessagingBlockedReason.NONE &&
    phoneNumberIdOk &&
    !verifyConfigured
  ) {
    blockedReason = MessagingBlockedReason.WEBHOOK_VERIFY_TOKEN_MISSING;
  }

  if (token && wabaId) {
    wabaProbeStatus = await probeGet(base + "/" + wabaId + "?fields=id", token);
  }
  const wabaOk = !wabaId || wabaProbeStatus === 200;

  const envOk = !!(token && phoneId);
  const authFail = st === 401 || st === 403;
  const readyToSendMessages =
    envOk &&
    phoneNumberIdOk &&
    !authFail &&
    !registrationBlocksSend;

  const inboxHealth = await getInboxPersistenceHealth(prisma);

  return {
    envOk,
    tokenOk: phoneNumberIdOk && !authFail,
    wabaOk,
    phoneNumberIdOk,
    webhookVerifyTokenConfigured: verifyConfigured,
    readyToVerifyWebhook: verifyConfigured,
    readyToReceiveEvents: verifyConfigured && phoneNumberIdOk && !authFail,
    readyToSendMessages,
    blockedReason,
    metaSummary: {
      apiVersion: ver,
      phoneProbeStatus,
      wabaProbeStatus,
      persistedRegistered,
    },
    persistenceOk: inboxHealth.persistenceOk,
    messagesStored: inboxHealth.messagesStored,
    lastMessageStoredAt: inboxHealth.lastMessageStoredAt,
  };
}
