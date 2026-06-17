import { describe, expect, it } from "vitest";
import { evaluateCareerAgentPolicy } from "../policy.js";
import { buildCareerAgentContext } from "../context.js";
import { buildCareerAgentRequest } from "../request.js";
import { createSampleCareerBundle, createSampleOrchestrationBody } from "./fixtures.js";

describe("evaluateCareerAgentPolicy", () => {
  it("allows a valid context", () => {
    const body = createSampleOrchestrationBody();
    const request = buildCareerAgentRequest(body);
    const context = buildCareerAgentContext(request);

    expect(evaluateCareerAgentPolicy(request, context)).toEqual({ allowed: true });
  });

  it("blocks without explicit consent", () => {
    const body = createSampleOrchestrationBody();
    const request = buildCareerAgentRequest(body);
    const context = buildCareerAgentContext(request);
    const withoutConsent = { ...request, explicitConsent: false as never };

    expect(evaluateCareerAgentPolicy(withoutConsent, context)).toMatchObject({
      allowed: false,
      code: "explicit_consent_required",
    });
  });

  it("blocks unsafe context with forbidden keys", () => {
    const body = createSampleOrchestrationBody({
      context: {
        careerBundle: createSampleCareerBundle(),
        selectedSignalIds: [],
        availableSignals: [],
      },
    });
    const request = buildCareerAgentRequest({
      ...body,
      context: {
        ...body.context,
        careerBundle: {
          ...body.context.careerBundle,
          applications: [
            {
              ...body.context.careerBundle.applications[0],
              notes: "Bearer secret-token-value",
            },
          ],
        },
      },
    });
    const context = buildCareerAgentContext(request);

    expect(evaluateCareerAgentPolicy(request, context).allowed).toBe(false);
  });

  it("blocks unknown selected signal ids", () => {
    const body = createSampleOrchestrationBody({
      context: {
        careerBundle: createSampleCareerBundle(),
        selectedSignalIds: ["missing-signal"],
        availableSignals: [],
      },
    });
    const request = buildCareerAgentRequest(body);
    const context = buildCareerAgentContext(request);

    expect(evaluateCareerAgentPolicy(request, context)).toMatchObject({
      allowed: false,
      code: "missing_required_input",
    });
  });

  it("blocks empty career bundle applications", () => {
    const body = createSampleOrchestrationBody({
      context: {
        careerBundle: createSampleCareerBundle({ applications: [] }),
        selectedSignalIds: [],
      },
    });
    const request = buildCareerAgentRequest(body);
    const context = buildCareerAgentContext(request);

    expect(evaluateCareerAgentPolicy(request, context)).toMatchObject({
      allowed: false,
      code: "missing_required_input",
    });
  });
});
