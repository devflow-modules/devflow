import { guardWhatsappOnboarding } from "@/modules/whatsapp-onboarding";
import { getMessagingHealth } from "@/modules/whatsapp-messaging";
import { onboardingError, onboardingJson } from "../../onboarding/_utils";

export async function GET(request: Request) {
  const denied = guardWhatsappOnboarding(request);
  if (denied) return denied;
  try {
    const health = await getMessagingHealth();
    return onboardingJson(health);
  } catch (e) {
    return onboardingError(e);
  }
}
