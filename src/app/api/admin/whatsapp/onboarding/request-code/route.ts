import { NextResponse } from "next/server";
import { guardWhatsappOnboarding, whatsappOnboardingService } from "@/modules/whatsapp-onboarding";
import { requestCodeBodySchema } from "@/modules/whatsapp-onboarding/whatsappOnboarding.schemas";
import { onboardingError, onboardingJson } from "../_utils";

export async function POST(request: Request) {
  const denied = guardWhatsappOnboarding(request);
  if (denied) return denied;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "JSON inválido" }, { status: 400 });
  }
  const parsed = requestCodeBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, issues: parsed.error.flatten() },
      { status: 400 }
    );
  }
  try {
    const data = await whatsappOnboardingService.requestVerificationCode(
      parsed.data.codeMethod,
      parsed.data.language,
      parsed.data.phoneNumberId
    );
    return onboardingJson(data);
  } catch (e) {
    return onboardingError(e);
  }
}
