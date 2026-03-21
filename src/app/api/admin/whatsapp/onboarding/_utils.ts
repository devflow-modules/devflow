import { NextResponse } from "next/server";
import type { MappedMetaError } from "@/modules/whatsapp-onboarding/whatsappOnboarding.types";
import { mapMetaError } from "@/modules/whatsapp-onboarding/whatsappOnboarding.errors";

export function onboardingJson<T>(data: T, status = 200) {
  return NextResponse.json({ success: true as const, data }, { status });
}

export function onboardingError(e: unknown) {
  if (e instanceof Error && "mapped" in e) {
    const m = (e as Error & { mapped: MappedMetaError }).mapped;
    return NextResponse.json(
      { success: false as const, error: { code: m.code, message: m.message, metaCode: m.metaCode, fbtraceId: m.fbtraceId } },
      { status: m.httpStatus }
    );
  }
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.includes("ausente")) {
    const m = mapMetaError(400, {});
    return NextResponse.json(
      { success: false, error: { code: "MISSING_CONFIG", message: msg } },
      { status: 400 }
    );
  }
  return NextResponse.json(
    { success: false as const, error: { code: "INTERNAL", message: msg } },
    { status: 500 }
  );
}
