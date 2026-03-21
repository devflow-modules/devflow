import { NextResponse } from "next/server";
import { guardWhatsappOnboarding, whatsappOnboardingService } from "@/modules/whatsapp-onboarding";
import { statusQuerySchema } from "@/modules/whatsapp-onboarding/whatsappOnboarding.schemas";
import { onboardingError, onboardingJson } from "../_utils";

export async function GET(request: Request) {
  const denied = guardWhatsappOnboarding(request);
  if (denied) return denied;
  const { searchParams } = new URL(request.url);
  const q = statusQuerySchema.safeParse({
    phoneNumberId: searchParams.get("phoneNumberId") || undefined,
  });
  if (!q.success) {
    return NextResponse.json(
      { success: false, issues: q.error.flatten() },
      { status: 400 }
    );
  }
  try {
    const data = await whatsappOnboardingService.getPhoneNumberStatus(
      q.data.phoneNumberId
    );
    const review = whatsappOnboardingService.getDisplayNameReviewStatus(
      q.data.phoneNumberId
    );
    return onboardingJson({ ...data, displayNameMeta: review });
  } catch (e) {
    return onboardingError(e);
  }
}
