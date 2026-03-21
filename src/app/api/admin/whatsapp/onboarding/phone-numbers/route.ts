import { guardWhatsappOnboarding, whatsappOnboardingService } from "@/modules/whatsapp-onboarding";
import { onboardingError, onboardingJson } from "../_utils";

export async function GET(request: Request) {
  const denied = guardWhatsappOnboarding(request);
  if (denied) return denied;
  try {
    const data = await whatsappOnboardingService.getBusinessPhoneNumbers();
    return onboardingJson(data);
  } catch (e) {
    return onboardingError(e);
  }
}
