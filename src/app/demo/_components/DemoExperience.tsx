"use client";

import { DemoGuidedExperience } from "./DemoGuidedExperience";
import { LegacyDemoExperience } from "./LegacyDemoExperience";

/**
 * Experiência guiada (padrão). Desative com NEXT_PUBLIC_WHATSAPP_DEMO_GUIDED=false para fallback à demo antiga.
 */
export function DemoExperience() {
  const guided =
    typeof process.env.NEXT_PUBLIC_WHATSAPP_DEMO_GUIDED === "string"
      ? process.env.NEXT_PUBLIC_WHATSAPP_DEMO_GUIDED !== "false"
      : true;

  if (!guided) {
    return <LegacyDemoExperience />;
  }

  return <DemoGuidedExperience />;
}
