import { createSampleOrchestrationBody } from "../../career-agents/__tests__/fixtures.js";
import type { LibreChatCareerChatBody } from "../schemas.js";

export function createSampleLibreChatBody(
  overrides: Partial<LibreChatCareerChatBody> = {},
): LibreChatCareerChatBody {
  const orchestration = createSampleOrchestrationBody();

  return {
    action: "analyze_application_fit",
    message: "How well do I fit this backend role?",
    explicitConsent: true,
    context: {
      careerBundle: orchestration.context.careerBundle,
      selectedSignalIds: orchestration.context.selectedSignalIds,
      availableSignals: orchestration.context.availableSignals,
    },
    ...overrides,
  };
}
