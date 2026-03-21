import { guardWhatsappOnboarding, whatsappOnboardingService } from "@/modules/whatsapp-onboarding";
import { loadMetaOnboardingEnv } from "@/modules/whatsapp-onboarding/whatsappOnboarding.env";
import { onboardingError, onboardingJson } from "../_utils";

export async function GET(request: Request) {
  const denied = guardWhatsappOnboarding(request);
  if (denied) return denied;
  try {
    const phoneNumberId =
      new URL(request.url).searchParams.get("phoneNumberId")?.trim() || undefined;
    const health = await whatsappOnboardingService.getOperationalHealth(phoneNumberId);
    const env = loadMetaOnboardingEnv();
    return onboardingJson({
      ...health,
      query: phoneNumberId ? { phoneNumberId } : {},
      meta: {
        apiVersion: env.META_API_VERSION,
        wabaIdConfigured: !!env.META_WABA_ID,
        phoneNumberIdConfigured: !!env.META_PHONE_NUMBER_ID,
        verifyTokenConfigured: !!env.WHATSAPP_VERIFY_TOKEN?.trim(),
      },
    });
  } catch (e) {
    return onboardingError(e);
  }
}
