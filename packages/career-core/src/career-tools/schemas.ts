import { z } from "zod";
import { careerAgentOrchestrationBodySchema } from "../career-agents/schemas.js";
import type { CareerToolName } from "./types.js";

export const readBundleInputSchema = z
  .object({
    bundleId: z.string().min(1).optional(),
  })
  .strict();

export const readSelectedSignalsInputSchema = z
  .object({
    selectedSignalIds: z.array(z.string().min(1)),
  })
  .strict();

export const deriveFitSummaryInputSchema = z
  .object({
    applicationId: z.string().min(1),
    selectedSignalIds: z.array(z.string().min(1)).optional(),
  })
  .strict();

export const deriveGapAnalysisInputSchema = z
  .object({
    targetRole: z.string().min(1),
    requiredSkills: z.array(z.string().min(1)).min(1),
  })
  .strict();

export const deriveInterviewPlanInputSchema = z
  .object({
    applicationId: z.string().min(1),
    focusAreas: z.array(z.string().min(1)).optional(),
  })
  .strict();

export const createReviewProposalInputSchema = z
  .object({
    sourceResultId: z.string().min(1),
    proposalType: z.enum(["fit_summary", "gap_analysis", "interview_plan"]),
  })
  .strict();

export const exportReviewPayloadInputSchema = z
  .object({
    payloadType: z.enum(["fit_summary", "gap_analysis", "interview_plan", "review_proposal"]),
    format: z.enum(["json", "markdown"]),
  })
  .strict();

export const careerToolApprovalSchema = z
  .object({
    toolName: z.string().min(1),
    approved: z.literal(true),
    approvedAt: z.string().min(1),
    approvalScope: z.enum(["single_execution", "single_request"]),
  })
  .strict();

export const careerToolInvokeBodySchema = z
  .object({
    agentRequestId: z.string().min(1),
    toolName: z.string().min(1),
    input: z.record(z.unknown()),
    explicitApproval: z.literal(true),
    approval: careerToolApprovalSchema.optional(),
    orchestration: careerAgentOrchestrationBodySchema,
  })
  .strict();

const TOOL_INPUT_SCHEMAS: Record<CareerToolName, z.ZodType<unknown>> = {
  "career.read_bundle": readBundleInputSchema,
  "career.read_selected_signals": readSelectedSignalsInputSchema,
  "career.derive_fit_summary": deriveFitSummaryInputSchema,
  "career.derive_gap_analysis": deriveGapAnalysisInputSchema,
  "career.derive_interview_plan": deriveInterviewPlanInputSchema,
  "career.create_review_proposal": createReviewProposalInputSchema,
  "career.export_review_payload": exportReviewPayloadInputSchema,
};

export function parseCareerToolInput(toolName: CareerToolName, input: unknown) {
  const schema = TOOL_INPUT_SCHEMAS[toolName];
  return schema.safeParse(input);
}

export function getCareerToolInputJsonSchema(toolName: CareerToolName): Record<string, unknown> {
  switch (toolName) {
    case "career.read_bundle":
      return { type: "object", properties: { bundleId: { type: "string" } }, additionalProperties: false };
    case "career.read_selected_signals":
      return {
        type: "object",
        properties: { selectedSignalIds: { type: "array", items: { type: "string" } } },
        required: ["selectedSignalIds"],
        additionalProperties: false,
      };
    case "career.derive_fit_summary":
      return {
        type: "object",
        properties: {
          applicationId: { type: "string" },
          selectedSignalIds: { type: "array", items: { type: "string" } },
        },
        required: ["applicationId"],
        additionalProperties: false,
      };
    case "career.derive_gap_analysis":
      return {
        type: "object",
        properties: {
          targetRole: { type: "string" },
          requiredSkills: { type: "array", items: { type: "string" } },
        },
        required: ["targetRole", "requiredSkills"],
        additionalProperties: false,
      };
    case "career.derive_interview_plan":
      return {
        type: "object",
        properties: {
          applicationId: { type: "string" },
          focusAreas: { type: "array", items: { type: "string" } },
        },
        required: ["applicationId"],
        additionalProperties: false,
      };
    case "career.create_review_proposal":
      return {
        type: "object",
        properties: {
          sourceResultId: { type: "string" },
          proposalType: { type: "string", enum: ["fit_summary", "gap_analysis", "interview_plan"] },
        },
        required: ["sourceResultId", "proposalType"],
        additionalProperties: false,
      };
    case "career.export_review_payload":
      return {
        type: "object",
        properties: {
          payloadType: {
            type: "string",
            enum: ["fit_summary", "gap_analysis", "interview_plan", "review_proposal"],
          },
          format: { type: "string", enum: ["json", "markdown"] },
        },
        required: ["payloadType", "format"],
        additionalProperties: false,
      };
    default:
      return { type: "object", additionalProperties: false };
  }
}
