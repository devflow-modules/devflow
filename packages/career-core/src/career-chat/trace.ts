import type { CareerChatTrace, CareerChatTraceStep, CareerChatTraceStepCode } from "./types.js";

export function createCareerChatTrace(conversationId: string): CareerChatTrace {
  return {
    conversationId,
    steps: [],
  };
}

export function createCareerChatTraceStep(input: {
  timestamp: string;
  status: CareerChatTraceStep["status"];
  code: CareerChatTraceStepCode;
  message: string;
}): CareerChatTraceStep {
  return {
    timestamp: input.timestamp,
    status: input.status,
    code: input.code,
    message: input.message,
  };
}

export function appendCareerChatTraceStep(
  trace: CareerChatTrace,
  step: CareerChatTraceStep,
): CareerChatTrace {
  return {
    ...trace,
    steps: [...trace.steps, step],
  };
}
