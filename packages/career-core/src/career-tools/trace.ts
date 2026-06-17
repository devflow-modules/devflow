import type { CareerToolTrace, CareerToolTraceStep, CareerToolTraceStepCode } from "./types.js";

export function createCareerToolTrace(requestId: string, toolName: CareerToolTrace["toolName"]): CareerToolTrace {
  return { requestId, toolName, steps: [] };
}

export function appendCareerToolTraceStep(
  trace: CareerToolTrace,
  step: CareerToolTraceStep,
): CareerToolTrace {
  return { ...trace, steps: [...trace.steps, step] };
}

export function createCareerToolTraceStep(input: {
  timestamp: string;
  status: CareerToolTraceStep["status"];
  code: CareerToolTraceStepCode;
  message: string;
}): CareerToolTraceStep {
  return {
    timestamp: input.timestamp,
    status: input.status,
    code: input.code,
    message: input.message,
  };
}
