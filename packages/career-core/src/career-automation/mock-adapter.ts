import { invokeCareerTool } from "../career-tools/invoke.js";
import type {
  CareerAutomationAdapter,
  CareerAutomationAdapterRequest,
  CareerAutomationAdapterResponse,
} from "./types.js";

/**
 * Deterministic, network-free automation adapter. Reuses the existing pure career
 * tool engine. Same input → same result. No retry, no background, no persistence.
 */
export class MockCareerAutomationAdapter implements CareerAutomationAdapter {
  public readonly provider = "mock" as const;

  async execute(input: CareerAutomationAdapterRequest): Promise<CareerAutomationAdapterResponse> {
    const toolResult = invokeCareerTool(input.toolInvocation, input.requestedAt);

    if (toolResult.status !== "completed") {
      return {
        ok: false,
        externalCall: false,
        data: {},
        toolResult,
        durationMs: 0,
        error: {
          code: "automation_execution_failed",
          message: toolResult.warnings[0]?.message ?? "Automation tool execution did not complete.",
        },
      };
    }

    return {
      ok: true,
      externalCall: false,
      data: toolResult.data,
      toolResult,
      durationMs: 0,
    };
  }
}

export function createMockCareerAutomationAdapter(): CareerAutomationAdapter {
  return new MockCareerAutomationAdapter();
}
