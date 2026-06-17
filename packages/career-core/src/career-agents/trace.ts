import type {
  CareerAgentTrace,
  CareerAgentTraceStep,
  CareerAgentTraceStepCode,
  CareerAgentTraceStepStatus,
} from "./types.js";

export function createCareerAgentTraceStep(input: {
  timestamp: string;
  status: CareerAgentTraceStepStatus;
  code: CareerAgentTraceStepCode;
  message: string;
}): CareerAgentTraceStep {
  return {
    timestamp: input.timestamp,
    status: input.status,
    code: input.code,
    message: input.message,
  };
}

export function createInitialCareerAgentTrace(requestId: string): CareerAgentTrace {
  return { requestId, steps: [] };
}

export function appendCareerAgentTraceStep(
  trace: CareerAgentTrace,
  step: CareerAgentTraceStep,
): CareerAgentTrace {
  return {
    requestId: trace.requestId,
    steps: [...trace.steps, step],
  };
}
