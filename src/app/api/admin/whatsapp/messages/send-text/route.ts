import { guardWhatsappOnboarding } from "@/modules/whatsapp-onboarding";
import {
  sendTextBodySchema,
  sendTextMessage,
} from "@/modules/whatsapp-messaging";
import { onboardingJson } from "../../onboarding/_utils";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const denied = guardWhatsappOnboarding(request);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_JSON", message: "Body JSON inválido" } },
      { status: 400 }
    );
  }

  const parsed = sendTextBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: parsed.error.flatten().fieldErrors,
        },
      },
      { status: 400 }
    );
  }

  const result = await sendTextMessage(parsed.data);
  if (result.success) {
    return onboardingJson(result);
  }
  const http = result.httpStatus && result.httpStatus >= 400 ? result.httpStatus : 502;
  return NextResponse.json({ success: false as const, data: result }, { status: http });
}
