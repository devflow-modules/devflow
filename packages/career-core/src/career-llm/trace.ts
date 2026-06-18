import type { CareerLlmTrace, CareerLlmTraceStep, CareerLlmTraceStepCode, CareerLlmTraceStepStatus } from "./types.js";

export function createCareerLlmTrace(requestId: string): CareerLlmTrace {
  return {
    requestId,
    steps: [],
  };
}

export function createCareerLlmTraceStep(input: {
  timestamp: string;
  status: CareerLlmTraceStepStatus;
  code: CareerLlmTraceStepCode;
  message: string;
}): CareerLlmTraceStep {
  return {
    timestamp: input.timestamp,
    status: input.status,
    code: input.code,
    message: input.message,
  };
}

export function appendCareerLlmTraceStep(
  trace: CareerLlmTrace,
  step: CareerLlmTraceStep,
): CareerLlmTrace {
  return {
    ...trace,
    steps: [...trace.steps, step],
  };
}
