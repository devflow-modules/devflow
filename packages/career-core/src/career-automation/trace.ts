import type {
  CareerAutomationTrace,
  CareerAutomationTraceStep,
  CareerAutomationTraceStepCode,
  CareerAutomationTraceStepStatus,
} from "./types.js";

export function createCareerAutomationTrace(requestId: string, proposalId: string): CareerAutomationTrace {
  return { requestId, proposalId, steps: [] };
}

export function createCareerAutomationTraceStep(input: {
  timestamp: string;
  status: CareerAutomationTraceStepStatus;
  code: CareerAutomationTraceStepCode;
  message: string;
}): CareerAutomationTraceStep {
  return {
    timestamp: input.timestamp,
    status: input.status,
    code: input.code,
    message: input.message,
  };
}

export function appendCareerAutomationTraceStep(
  trace: CareerAutomationTrace,
  step: CareerAutomationTraceStep,
): CareerAutomationTrace {
  return { ...trace, steps: [...trace.steps, step] };
}
