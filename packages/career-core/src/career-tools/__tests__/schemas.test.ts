import { describe, expect, it } from "vitest";
import {
  createReviewProposalInputSchema,
  deriveFitSummaryInputSchema,
  deriveGapAnalysisInputSchema,
  deriveInterviewPlanInputSchema,
  exportReviewPayloadInputSchema,
  parseCareerToolInput,
  readBundleInputSchema,
  readSelectedSignalsInputSchema,
} from "../schemas.js";
import type { CareerToolName } from "../types.js";

const SENSITIVE_KEYS = [
  "access_token",
  "refresh_token",
  "client_secret",
  "Authorization",
  "connectionId",
  "messageId",
  "threadId",
  "eventId",
  "subject",
  "snippet",
  "body",
  "description",
  "location",
  "rawProviderPayload",
  "url",
  "headers",
  "command",
  "filesystemPath",
] as const;

type ToolSchemaCase = {
  toolName: CareerToolName;
  validMinimal: Record<string, unknown>;
  requiredField: string;
  invalidTypePatch: Record<string, unknown>;
};

const TOOL_CASES: ToolSchemaCase[] = [
  {
    toolName: "career.read_bundle",
    validMinimal: {},
    requiredField: "none",
    invalidTypePatch: { bundleId: 123 },
  },
  {
    toolName: "career.read_selected_signals",
    validMinimal: { selectedSignalIds: ["signal-1"] },
    requiredField: "selectedSignalIds",
    invalidTypePatch: { selectedSignalIds: "signal-1" },
  },
  {
    toolName: "career.derive_fit_summary",
    validMinimal: { applicationId: "app-1" },
    requiredField: "applicationId",
    invalidTypePatch: { applicationId: 1 },
  },
  {
    toolName: "career.derive_gap_analysis",
    validMinimal: { targetRole: "Backend Engineer", requiredSkills: ["Go"] },
    requiredField: "targetRole",
    invalidTypePatch: { targetRole: "Backend Engineer", requiredSkills: "Go" },
  },
  {
    toolName: "career.derive_interview_plan",
    validMinimal: { applicationId: "app-1" },
    requiredField: "applicationId",
    invalidTypePatch: { applicationId: false },
  },
  {
    toolName: "career.create_review_proposal",
    validMinimal: { sourceResultId: "result-1", proposalType: "fit_summary" },
    requiredField: "sourceResultId",
    invalidTypePatch: { sourceResultId: "result-1", proposalType: "invalid" },
  },
  {
    toolName: "career.export_review_payload",
    validMinimal: { payloadType: "review_proposal", format: "json" },
    requiredField: "payloadType",
    invalidTypePatch: { payloadType: "review_proposal", format: "pdf" },
  },
];

describe("career tool strict schemas", () => {
  for (const toolCase of TOOL_CASES) {
    describe(toolCase.toolName, () => {
      it("accepts minimal valid input", () => {
        expect(parseCareerToolInput(toolCase.toolName, toolCase.validMinimal).success).toBe(true);
      });

      it("rejects missing required field when applicable", () => {
        if (toolCase.requiredField === "none") {
          expect(parseCareerToolInput(toolCase.toolName, {}).success).toBe(true);
          return;
        }

        expect(parseCareerToolInput(toolCase.toolName, {}).success).toBe(false);
      });

      it("rejects extra fields", () => {
        expect(
          parseCareerToolInput(toolCase.toolName, {
            ...toolCase.validMinimal,
            unexpectedField: true,
          }).success,
        ).toBe(false);
      });

      it("rejects invalid types", () => {
        expect(parseCareerToolInput(toolCase.toolName, toolCase.invalidTypePatch).success).toBe(false);
      });

      for (const sensitiveKey of SENSITIVE_KEYS) {
        it(`rejects sensitive field ${sensitiveKey}`, () => {
          expect(
            parseCareerToolInput(toolCase.toolName, {
              ...toolCase.validMinimal,
              [sensitiveKey]: "blocked-value",
            }).success,
          ).toBe(false);
        });
      }
    });
  }

  it("exports individual zod schemas as strict objects", () => {
    expect(readBundleInputSchema.safeParse({ bundleId: "b-1", extra: true }).success).toBe(false);
    expect(readSelectedSignalsInputSchema.safeParse({ selectedSignalIds: [""] }).success).toBe(false);
    expect(deriveFitSummaryInputSchema.safeParse({ applicationId: "" }).success).toBe(false);
    expect(deriveGapAnalysisInputSchema.safeParse({ targetRole: "Role", requiredSkills: [] }).success).toBe(false);
    expect(deriveInterviewPlanInputSchema.safeParse({ applicationId: "" }).success).toBe(false);
    expect(createReviewProposalInputSchema.safeParse({ sourceResultId: "x", proposalType: "fit_summary", token: "x" }).success).toBe(false);
    expect(exportReviewPayloadInputSchema.safeParse({ payloadType: "review_proposal", format: "json", secret: "x" }).success).toBe(false);
  });
});
