/** Tipos de domínio — onboarding WhatsApp Cloud API (Graph API). */

export type CodeDeliveryMethod = "SMS" | "VOICE" | "IVR";

export type MetaGraphErrorBody = {
  error?: {
    message: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
    error_user_title?: string;
    error_user_msg?: string;
  };
};

export type PhoneNumberListItem = {
  id: string;
  display_phone_number?: string;
  verified_name?: string;
  code_verification_status?: string;
  quality_rating?: string;
  platform_type?: string;
  is_official_business_account?: boolean;
  throughput?: { level?: string };
};

export type PrerequisitesResult = {
  env: {
    hasToken: boolean;
    hasWabaId: boolean;
    hasPhoneNumberId: boolean;
    apiVersion: string;
    tokenSource: "META_SYSTEM_USER_TOKEN" | "WHATSAPP_ACCESS_TOKEN" | "none";
  };
  graphReachable: boolean;
  wabaAccessible: boolean;
  businessIdConfigured: boolean;
  blockers: string[];
};

export type OnboardingHealth = {
  envOk: boolean;
  tokenOk: boolean;
  businessConfigured: boolean;
  wabaOk: boolean;
  phoneNumbersCount: number;
  primaryPhone?: {
    id: string;
    displayPhone?: string;
    codeVerificationStatus?: string;
    qualityRating?: string;
  };
  onboardingStage:
    | "missing_env"
    | "token_invalid"
    | "waba_unreachable"
    | "awaiting_sms_verification"
    | "awaiting_register_pin"
    | "registered"
    | "unknown";
  readyForWebhook: boolean;
  readyToSendMessages: boolean;
  notes: string[];
};

export type MappedMetaError = {
  code: string;
  httpStatus: number;
  message: string;
  metaCode?: number;
  metaSubcode?: number;
  fbtraceId?: string;
};
