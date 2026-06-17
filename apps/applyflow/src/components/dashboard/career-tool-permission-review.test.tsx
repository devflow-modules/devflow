import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  CAREER_TOOL_PERMISSION_REVIEW_DISCLAIMER,
  CAREER_TOOL_PERMISSION_REVIEW_TITLE,
} from "./career-tool-permission-review-content";
import { CareerToolPermissionReviewView } from "./career-tool-permission-review";

describe("CareerToolPermissionReviewView", () => {
  it("renders allowed tool with disclaimer and manual review", () => {
    const html = renderToStaticMarkup(
      <CareerToolPermissionReviewView
        toolName="career.derive_fit_summary"
        agentResult={{
          status: "completed",
          agent: "application_analyst",
          summary: "ok",
          findings: [],
          recommendations: [],
          evidence: [],
          warnings: [],
          reviewRequired: true,
          safeForClient: true,
          hasToken: false,
          rawProviderDataUsed: false,
          persisted: false,
          trace: { requestId: "req-1", steps: [] },
          executionPlan: {
            selectedAgent: "application_analyst",
            reason: "routed",
            requiredInputs: [],
            missingInputs: [],
            allowedCapabilities: ["derive_fit_summary"],
            blockedCapabilities: ["submit_application"],
            reviewRequired: true,
          },
        }}
        orchestration={{
          intent: "analyze_application_fit",
          explicitConsent: true,
          context: {
            careerBundle: {
              schemaVersion: "1.0",
              exportedAt: "2026-06-16T12:00:00.000Z",
              sourceProduct: "applyflow",
              applications: [
                {
                  id: "app-1",
                  company: "Acme",
                  role: "Backend Engineer",
                  source: "linkedin",
                  requiredSkills: ["TypeScript"],
                  status: "applied",
                },
              ],
            },
            selectedSignalIds: [],
          },
        }}
        agentRequestId="req-1"
        toolResult={null}
        approvedOnce={false}
        isRunning={false}
        onApproveOnce={() => undefined}
        onCancel={() => undefined}
        onRunApprovedTool={() => undefined}
        onCopyResult={() => undefined}
      />,
    );

    expect(html).toContain(CAREER_TOOL_PERMISSION_REVIEW_TITLE);
    expect(html).toContain(CAREER_TOOL_PERMISSION_REVIEW_DISCLAIMER);
    expect(html).toContain("Manual review");
    expect(html).not.toMatch(/Always allow|Run automatically|Execute all|Background mode|Remember approval/i);
  });

  it("exposes keyboard-accessible action buttons", () => {
    const html = renderToStaticMarkup(
      <CareerToolPermissionReviewView
        toolName="career.export_review_payload"
        agentResult={{
          status: "completed",
          agent: "application_analyst",
          summary: "ok",
          findings: [],
          recommendations: [],
          evidence: [],
          warnings: [],
          reviewRequired: true,
          safeForClient: true,
          hasToken: false,
          rawProviderDataUsed: false,
          persisted: false,
          trace: { requestId: "req-1", steps: [] },
          executionPlan: {
            selectedAgent: "application_analyst",
            reason: "routed",
            requiredInputs: [],
            missingInputs: [],
            allowedCapabilities: ["create_review_proposal"],
            blockedCapabilities: [],
            reviewRequired: true,
          },
        }}
        orchestration={{
          intent: "analyze_application_fit",
          explicitConsent: true,
          context: {
            careerBundle: {
              schemaVersion: "1.0",
              exportedAt: "2026-06-16T12:00:00.000Z",
              sourceProduct: "applyflow",
              applications: [
                {
                  id: "app-1",
                  company: "Acme",
                  role: "Backend Engineer",
                  source: "linkedin",
                  requiredSkills: ["TypeScript"],
                  status: "applied",
                },
              ],
            },
            selectedSignalIds: [],
          },
        }}
        agentRequestId="req-1"
        toolResult={null}
        approvedOnce={false}
        isRunning={false}
        onApproveOnce={() => undefined}
        onCancel={() => undefined}
        onRunApprovedTool={() => undefined}
        onCopyResult={() => undefined}
      />,
    );

    expect(html).toContain('data-testid="career-tool-approve-once-button"');
    expect(html).toContain('data-testid="career-tool-run-button"');
  });
});
