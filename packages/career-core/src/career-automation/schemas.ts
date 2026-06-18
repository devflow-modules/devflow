import { z } from "zod";
import { careerAgentOrchestrationBodySchema } from "../career-agents/schemas.js";
import { CAREER_AUTOMATION_KINDS } from "./constants.js";

const automationContextSchema = careerAgentOrchestrationBodySchema.shape.context;

/**
 * Public request body for POST /career-automation/execute.
 * The client never sends a tool name, capability, risk level, execution mode,
 * provider secret, endpoint, URL, headers, command, filesystem path, retry policy,
 * schedule, cron, or background mode. The schema is strict to reject extras.
 * The approval object is server-built from explicitApproval + the resolved proposal.
 */
export const careerAutomationExecuteBodySchema = z
  .object({
    agentRequestId: z.string().min(1).optional(),
    proposalId: z.string().min(1).optional(),
    kind: z.enum(CAREER_AUTOMATION_KINDS),
    explicitApproval: z.literal(true),
    approvalScope: z.enum(["single_execution", "single_request"]).optional(),
    context: automationContextSchema,
  })
  .strict();

export type CareerAutomationExecuteBody = z.infer<typeof careerAutomationExecuteBodySchema>;

export function parseCareerAutomationExecuteBody(
  body: unknown,
): { ok: true; value: CareerAutomationExecuteBody } | { ok: false; error: "invalid_request" } {
  const parsed = careerAutomationExecuteBodySchema.safeParse(body);
  if (!parsed.success) {
    return { ok: false, error: "invalid_request" };
  }

  return { ok: true, value: parsed.data };
}
