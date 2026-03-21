import { z } from "zod";

const envSchema = z.object({
  META_API_VERSION: z.string().min(1).default("v21.0"),
  META_WABA_ID: z.string().min(1).optional(),
  META_PHONE_NUMBER_ID: z.string().min(1).optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().min(1).optional(),
  META_BUSINESS_ID: z.string().min(1).optional(),
  META_APP_ID: z.string().optional(),
  META_APP_SECRET: z.string().optional(),
  META_SYSTEM_USER_TOKEN: z.string().min(1).optional(),
  META_WHATSAPP_ACCESS_TOKEN: z.string().min(1).optional(),
  WHATSAPP_ACCESS_TOKEN: z.string().min(1).optional(),
  WHATSAPP_VERIFY_TOKEN: z.string().optional(),
});

export type MetaOnboardingEnv = z.infer<typeof envSchema> & {
  /** Token efetivo para Graph API (system user ou fallback). */
  effectiveAccessToken: string | null;
};

export function loadMetaOnboardingEnv(
  env: NodeJS.ProcessEnv = process.env
): MetaOnboardingEnv {
  const parsed = envSchema.safeParse({
    META_API_VERSION: env.META_API_VERSION ?? "v21.0",
    META_WABA_ID: env.META_WABA_ID,
    META_PHONE_NUMBER_ID: env.META_PHONE_NUMBER_ID,
    WHATSAPP_PHONE_NUMBER_ID: env.WHATSAPP_PHONE_NUMBER_ID,
    META_BUSINESS_ID: env.META_BUSINESS_ID,
    META_APP_ID: env.META_APP_ID,
    META_APP_SECRET: env.META_APP_SECRET,
    META_SYSTEM_USER_TOKEN: env.META_SYSTEM_USER_TOKEN,
    META_WHATSAPP_ACCESS_TOKEN: env.META_WHATSAPP_ACCESS_TOKEN,
    WHATSAPP_ACCESS_TOKEN: env.WHATSAPP_ACCESS_TOKEN,
    WHATSAPP_VERIFY_TOKEN: env.WHATSAPP_VERIFY_TOKEN,
  });

  if (!parsed.success) {
    return {
      META_API_VERSION: "v21.0",
      effectiveAccessToken: null,
    } as MetaOnboardingEnv;
  }

  const d = parsed.data;
  const effectiveAccessToken =
    d.META_SYSTEM_USER_TOKEN?.trim() ||
    d.META_WHATSAPP_ACCESS_TOKEN?.trim() ||
    d.WHATSAPP_ACCESS_TOKEN?.trim() ||
    null;
  const phoneNumberId =
    d.META_PHONE_NUMBER_ID?.trim() || d.WHATSAPP_PHONE_NUMBER_ID?.trim() || undefined;

  return {
    ...d,
    META_PHONE_NUMBER_ID: phoneNumberId,
    effectiveAccessToken,
  };
}
