import { BlockedReason, OnboardingCurrentStage } from "./whatsappOnboarding.operational.enums";
import type { LastOperation } from "./whatsappOnboarding.operational.enums";
import {
  inferNameStatusBlock,
  isCloudApiRegistered,
  isCodeVerifiedOnMeta,
} from "./whatsappOnboarding.registration";
import type { PhoneNumberListItem } from "./whatsappOnboarding.types";
import type {
  OperationalHealthPayload,
  WhatsappOnboardingStateRow,
} from "./whatsappOnboardingState.types";

const CODE_REQUEST_TTL_MS = 20 * 60 * 1000;

export function buildOperationalHealth(input: {
  envHasToken: boolean;
  envHasWaba: boolean;
  envHasVerifyToken: boolean;
  tokenOk: boolean;
  wabaOk: boolean;
  businessConfigured: boolean;
  businessId: string | null;
  wabaId: string | null;
  phone: PhoneNumberListItem | null;
  phoneNumbersCount: number;
  persisted: WhatsappOnboardingStateRow | null;
  persistenceOk: boolean;
  listOrStatusError: string | null;
}): OperationalHealthPayload {
  const notes: string[] = [];
  const wabaId = input.wabaId;
  const phone = input.phone;
  const p = input.persisted;

  let blockedReason: BlockedReason = BlockedReason.NONE;
  let currentStage: OnboardingCurrentStage = OnboardingCurrentStage.NOT_STARTED;

  if (!input.envHasToken || !input.envHasWaba) {
    blockedReason = BlockedReason.MISSING_ENV;
    currentStage = OnboardingCurrentStage.BLOCKED;
    notes.push("Configure META_SYSTEM_USER_TOKEN (ou WHATSAPP_ACCESS_TOKEN) e META_WABA_ID.");
  } else if (!input.tokenOk) {
    blockedReason = BlockedReason.META_TOKEN_INVALID;
    currentStage = OnboardingCurrentStage.BLOCKED;
  } else if (!input.wabaOk) {
    blockedReason = BlockedReason.WABA_NOT_ACCESSIBLE;
    currentStage = OnboardingCurrentStage.BLOCKED;
    notes.push("Token sem acesso ao WABA ou WABA_ID incorreto.");
  } else if (!phone) {
    blockedReason = BlockedReason.PHONE_NUMBER_NOT_FOUND;
    currentStage = OnboardingCurrentStage.BLOCKED;
    notes.push(
      "Número não encontrado na lista do WABA — confira META_PHONE_NUMBER_ID / WHATSAPP_PHONE_NUMBER_ID."
    );
  }

  const nameBlock = phone ? inferNameStatusBlock(phone as PhoneNumberListItem) : null;
  if (blockedReason === BlockedReason.NONE && nameBlock === "REJECTED") {
    blockedReason = BlockedReason.DISPLAY_NAME_REJECTED;
    currentStage = OnboardingCurrentStage.BLOCKED;
    notes.push("Display name reprovado na Meta — ajuste no Gerenciador de Negócios.");
  } else if (blockedReason === BlockedReason.NONE && nameBlock === "PENDING") {
    blockedReason = BlockedReason.DISPLAY_NAME_REVIEW_PENDING;
    notes.push("Display name em revisão — aguarde aprovação Meta.");
  }

  if (input.listOrStatusError && blockedReason === BlockedReason.NONE) {
    blockedReason = BlockedReason.META_API_ERROR;
    notes.push(input.listOrStatusError);
  }

  const cloud = phone ? isCloudApiRegistered(phone) : false;
  const metaVerified = phone ? isCodeVerifiedOnMeta(phone) : false;

  const codeRequestedRecently =
    p?.codeRequestedAt &&
    Date.now() - new Date(p.codeRequestedAt).getTime() < CODE_REQUEST_TTL_MS;

  let canRequestCode =
    blockedReason === BlockedReason.NONE &&
    !!phone &&
    !cloud &&
    !metaVerified;

  let canVerifyCode =
    blockedReason === BlockedReason.NONE &&
    !!phone &&
    !cloud &&
    !metaVerified &&
    (!!p?.codeRequestedAt || !!codeRequestedRecently);

  if (
    blockedReason === BlockedReason.NONE &&
    !metaVerified &&
    !cloud &&
    !p?.codeRequestedAt
  ) {
    canVerifyCode = false;
  }

  let canRegister =
    blockedReason === BlockedReason.NONE &&
    !!phone &&
    metaVerified &&
    !cloud;

  const readyToSendMessages = !!phone && cloud;
  const readyForWebhook =
    input.envHasVerifyToken && (readyToSendMessages || input.wabaOk);

  if (readyToSendMessages && blockedReason === BlockedReason.DISPLAY_NAME_REVIEW_PENDING) {
    blockedReason = BlockedReason.NONE;
  }

  if (cloud && blockedReason === BlockedReason.NONE) {
    currentStage = OnboardingCurrentStage.READY;
    if (p?.registeredAt || p?.codeVerifiedAt) {
      currentStage = OnboardingCurrentStage.REGISTERED;
    }
    canRequestCode = false;
    canVerifyCode = false;
    canRegister = false;
  } else if (metaVerified && !cloud && blockedReason === BlockedReason.NONE) {
    currentStage = OnboardingCurrentStage.CODE_VERIFIED;
    if (p?.codeRequestedAt && !p?.codeVerifiedAt) {
      currentStage = OnboardingCurrentStage.CODE_REQUESTED;
    }
  } else if (p?.codeRequestedAt && !metaVerified && !cloud && blockedReason === BlockedReason.NONE) {
    currentStage = OnboardingCurrentStage.CODE_REQUESTED;
  }

  if (p?.lastOperationStatus === "FAILURE" && p?.lastMetaErrorCode && blockedReason === BlockedReason.NONE) {
    notes.push(
      `Última falha Meta (${p.lastOperation}): código ${p.lastMetaErrorCode}.`
    );
  }

  const lastMetaError =
    p?.lastMetaErrorCode != null || p?.lastMetaErrorMessage
      ? {
          code: p.lastMetaErrorCode,
          message: p.lastMetaErrorMessage,
          operation: (p.lastOperation as LastOperation) || "NONE",
        }
      : null;

  const legacyStage =
    cloud
      ? "registered"
      : !metaVerified && phone
        ? "awaiting_sms_verification"
        : metaVerified
          ? "awaiting_register_pin"
          : "unknown";

  return {
    envOk: input.envHasToken && input.envHasWaba,
    tokenOk: input.tokenOk,
    wabaOk: input.wabaOk,
    businessConfigured: input.businessConfigured,
    phoneNumberFound: !!phone,
    currentStage,
    codeRequestedAt: p?.codeRequestedAt?.toISOString() ?? null,
    codeVerifiedAt: p?.codeVerifiedAt?.toISOString() ?? null,
    registeredAt: p?.registeredAt?.toISOString() ?? null,
    canRequestCode,
    canVerifyCode,
    canRegister,
    readyToSendMessages,
    readyForWebhook,
    blockedReason,
    lastMetaError,
    metaSummary: {
      codeVerificationStatus: phone?.code_verification_status ?? null,
      platformType: phone?.platform_type ?? null,
      qualityRating: phone?.quality_rating ?? null,
      verifiedName: phone?.verified_name ?? null,
      displayPhone: phone?.display_phone_number ?? null,
      phoneNumberId: phone?.id ?? null,
    },
    primaryPhoneId: phone?.id ?? null,
    wabaId,
    notes,
    persistence: {
      enabled: true,
      recordId: p?.id ?? null,
      degraded: !input.persistenceOk,
    },
    legacy: {
      onboardingStage: legacyStage,
      phoneNumbersCount: input.phoneNumbersCount,
    },
  };
}
