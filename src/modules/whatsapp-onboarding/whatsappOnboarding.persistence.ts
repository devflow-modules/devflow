import { PrismaWhatsappOnboardingStateRepository } from "./whatsappOnboardingState.repository";
import type { WhatsappOnboardingStateRepository } from "./whatsappOnboardingState.types";
import { onboardingLog } from "./whatsappOnboarding.logger";

let injected: WhatsappOnboardingStateRepository | null = null;

export function getOnboardingStateRepository(): WhatsappOnboardingStateRepository {
  return injected ?? new PrismaWhatsappOnboardingStateRepository();
}

export function setOnboardingStateRepositoryForTests(
  r: WhatsappOnboardingStateRepository | null
) {
  injected = r;
}

export async function safePersist(
  fn: (repo: WhatsappOnboardingStateRepository) => Promise<void>
): Promise<{ ok: boolean }> {
  try {
    await fn(getOnboardingStateRepository());
    return { ok: true };
  } catch (e) {
    onboardingLog.event("warn", "onboarding_state_persist_failed", {
      error: e instanceof Error ? e.message : String(e),
    });
    return { ok: false };
  }
}
