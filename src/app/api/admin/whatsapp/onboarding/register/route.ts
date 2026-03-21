import { NextResponse } from "next/server";
import { guardWhatsappOnboarding, whatsappOnboardingService } from "@/modules/whatsapp-onboarding";
import { registerBodySchema } from "@/modules/whatsapp-onboarding/whatsappOnboarding.schemas";
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
  const parsed = registerBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, issues: parsed.error.flatten() },
      { status: 400 }
    );
  }
  try {
    const data = await whatsappOnboardingService.registerPhoneNumber(
      parsed.data.pin,
      parsed.data.phoneNumberId
    );
    return onboardingJson({
      ...data,
      hint:
        "Guarde o PIN com segurança; é a verificação em duas etapas do número na Cloud API.",
    });
  } catch (e) {
    return onboardingError(e);
  }
}
