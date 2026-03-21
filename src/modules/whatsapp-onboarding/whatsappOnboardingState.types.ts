import type {
  BlockedReason,
  LastOperation,
  LastOperationStatus,
  OnboardingCurrentStage,
} from "./whatsappOnboarding.operational.enums";

export type WhatsappOnboardingStateRow = {
  id: string;
  wabaId: string;
  phoneNumberId: string;
  businessId: string | null;
  codeRequestedAt: Date | null;
  codeVerifiedAt: Date | null;
  registeredAt: Date | null;
  lastMetaErrorCode: number | null;
  lastMetaErrorMessage: string | null;
  lastOperation: string;
  lastOperationStatus: string;
  lastSuccessAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type OperationalHealthPayload = {
  envOk: boolean;
  tokenOk: boolean;
  wabaOk: boolean;
  businessConfigured: boolean;
  phoneNumberFound: boolean;
  currentStage: OnboardingCurrentStage;
  codeRequestedAt: string | null;
  codeVerifiedAt: string | null;
  registeredAt: string | null;
  canRequestCode: boolean;
  canVerifyCode: boolean;
  canRegister: boolean;
  readyToSendMessages: boolean;
  readyForWebhook: boolean;
  blockedReason: BlockedReason;
  lastMetaError: {
    code: number | null;
    message: string | null;
    operation: LastOperation | string;
  } | null;
  metaSummary: {
    codeVerificationStatus: string | null;
    platformType: string | null;
    qualityRating: string | null;
    verifiedName: string | null;
    displayPhone: string | null;
    phoneNumberId: string | null;
  };
  primaryPhoneId: string | null;
  wabaId: string | null;
  notes: string[];
  persistence: {
    enabled: boolean;
    recordId: string | null;
    degraded: boolean;
  };
  /** Compatibilidade com health anterior */
  legacy: {
    onboardingStage: string;
    phoneNumbersCount: number;
  };
};

export type RegisterResult =
  | {
      success: true;
      alreadyRegistered: boolean;
      idempotent: boolean;
      message: string;
    }
  | {
      success: false;
      alreadyRegistered?: false;
      idempotent?: false;
    };

export type WhatsappOnboardingStateRepository = {
  upsert(
    wabaId: string,
    phoneNumberId: string,
    patch: {
      businessId?: string | null;
      codeRequestedAt?: Date | null;
      codeVerifiedAt?: Date | null;
      registeredAt?: Date | null;
      lastMetaErrorCode?: number | null;
      lastMetaErrorMessage?: string | null;
      lastOperation?: string;
      lastOperationStatus?: string;
      lastSuccessAt?: Date | null;
    }
  ): Promise<WhatsappOnboardingStateRow>;
  findByWabaAndPhone(
    wabaId: string,
    phoneNumberId: string
  ): Promise<WhatsappOnboardingStateRow | null>;
};
