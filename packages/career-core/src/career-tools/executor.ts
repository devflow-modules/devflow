import { runApplicationAnalyst } from "../career-agents/agents/application-analyst.js";
import { runInterviewCoach } from "../career-agents/agents/interview-coach.js";
import { runProfileGapAnalyst } from "../career-agents/agents/profile-gap-analyst.js";
import type { CareerAgentContext } from "../career-agents/types.js";
import type { CareerToolName } from "./types.js";
import type {
  createReviewProposalInputSchema,
  deriveFitSummaryInputSchema,
  deriveGapAnalysisInputSchema,
  deriveInterviewPlanInputSchema,
  exportReviewPayloadInputSchema,
  readBundleInputSchema,
  readSelectedSignalsInputSchema,
} from "./schemas.js";
import type { z } from "zod";

type ReadBundleInput = z.infer<typeof readBundleInputSchema>;
type ReadSignalsInput = z.infer<typeof readSelectedSignalsInputSchema>;
type DeriveFitInput = z.infer<typeof deriveFitSummaryInputSchema>;
type DeriveGapInput = z.infer<typeof deriveGapAnalysisInputSchema>;
type DeriveInterviewInput = z.infer<typeof deriveInterviewPlanInputSchema>;
type CreateProposalInput = z.infer<typeof createReviewProposalInputSchema>;
type ExportPayloadInput = z.infer<typeof exportReviewPayloadInputSchema>;

function serializeProposalMarkdown(payload: Record<string, unknown>): string {
  return ["# Review payload preview", "", "```json", JSON.stringify(payload, null, 2), "```"].join("\n");
}

export function executeCareerToolPure(input: {
  toolName: CareerToolName;
  parsedInput: unknown;
  context: CareerAgentContext;
  agentRequestId: string;
  requestedAt: string;
}): Record<string, unknown> {
  switch (input.toolName) {
    case "career.read_bundle": {
      const parsed = input.parsedInput as ReadBundleInput;
      return {
        schemaVersion: input.context.careerBundle.schemaVersion,
        exportedAt: input.context.careerBundle.exportedAt,
        applicationCount: input.context.careerBundle.applications.length,
        bundleId: parsed.bundleId ?? input.context.requestId,
        candidate: input.context.careerBundle.candidate ?? null,
      };
    }
    case "career.read_selected_signals": {
      const parsed = input.parsedInput as ReadSignalsInput;
      const allowed = new Set(parsed.selectedSignalIds);
      return {
        signals: input.context.selectedSignals.filter((signal) => allowed.has(signal.id)),
        count: input.context.selectedSignals.filter((signal) => allowed.has(signal.id)).length,
      };
    }
    case "career.derive_fit_summary": {
      const parsed = input.parsedInput as DeriveFitInput;
      const output = runApplicationAnalyst(input.context);
      const application = input.context.careerBundle.applications.find((app) => app.id === parsed.applicationId);
      return {
        applicationId: parsed.applicationId,
        company: application?.company ?? null,
        role: application?.role ?? null,
        summary: output.summary,
        findings: output.findings,
        recommendations: output.recommendations,
      };
    }
    case "career.derive_gap_analysis": {
      const output = runProfileGapAnalyst(input.context);
      return {
        targetRole: (input.parsedInput as DeriveGapInput).targetRole,
        requiredSkills: (input.parsedInput as DeriveGapInput).requiredSkills,
        summary: output.summary,
        findings: output.findings,
        recommendations: output.recommendations,
      };
    }
    case "career.derive_interview_plan": {
      const parsed = input.parsedInput as DeriveInterviewInput;
      const output = runInterviewCoach(input.context);
      return {
        applicationId: parsed.applicationId,
        focusAreas: parsed.focusAreas ?? output.interviewPreparationProposal.focusAreas,
        studyTopics: output.interviewPreparationProposal.studyTopics,
        starPrompts: output.interviewPreparationProposal.starPrompts,
        mockInterviewPlan: output.interviewPreparationProposal.mockInterviewPlan,
      };
    }
    case "career.create_review_proposal": {
      const parsed = input.parsedInput as CreateProposalInput;
      return {
        sourceResultId: parsed.sourceResultId,
        proposalType: parsed.proposalType,
        agentRequestId: input.agentRequestId,
        reviewRequired: true,
        inMemory: true,
      };
    }
    case "career.export_review_payload": {
      const parsed = input.parsedInput as ExportPayloadInput;
      const payload = {
        payloadType: parsed.payloadType,
        agentRequestId: input.agentRequestId,
        reviewRequired: true,
        exportedAt: input.requestedAt,
      };
      if (parsed.format === "markdown") {
        return {
          format: "markdown",
          preview: serializeProposalMarkdown(payload),
        };
      }
      return {
        format: "json",
        preview: JSON.stringify(payload, null, 2),
      };
    }
    default:
      return {};
  }
}
