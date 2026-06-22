// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  CareerChatWorkspace,
  buildSpecialistAnalysisInput,
} from "./career-chat-workspace";
import { buildCareerSpecialistFieldsFromSimpleInputs } from "./career-pilot-input-normalizer";
import { buildPilotCareerBundleFromFields } from "./build-pilot-career-bundle";
import { EMPTY_CAREER_PILOT_SIMPLE_INPUTS } from "./career-pilot-simple-inputs";
import * as careerChatClient from "./career-chat-workspace-client";

const resumeText =
  "Desenvolvi APIs REST em Node.js com TypeScript. Reduzi deploy em 30% com pipelines CI/CD.";

describe("Career pilot simplified input integration", () => {
  beforeEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("preserves resume text when switching from resume to ATS intent", async () => {
    const user = userEvent.setup();
    let simpleInputs = { ...EMPTY_CAREER_PILOT_SIMPLE_INPUTS, resumeText };

    const view = render(
      <CareerChatWorkspace
        careerBundle={null}
        selectedSignalIds={[]}
        availableSignals={[]}
        pilotPresentation
        pilotIntent="analyze_resume"
        simpleInputs={simpleInputs}
        onSimpleInputsChange={(next) => {
          simpleInputs = next;
        }}
      />,
    );

    const panel = within(view.getByTestId("career-chat-workspace-panel"));
    expect((panel.getByTestId("career-pilot-resume-text") as HTMLTextAreaElement).value).toBe(
      resumeText,
    );

    await user.click(panel.getByTestId("career-pilot-intent-analyze_ats_compatibility"));

    expect((panel.getByTestId("career-pilot-resume-text") as HTMLTextAreaElement).value).toBe(
      resumeText,
    );
  });

  it("builds compatible analysisInput and CareerBundle from simple inputs", () => {
    const fields = buildCareerSpecialistFieldsFromSimpleInputs(
      {
        ...EMPTY_CAREER_PILOT_SIMPLE_INPUTS,
        resumeText,
        jobDescription: "Requisitos:\nExperiência com TypeScript\nInglês intermediário",
      },
      "analyze_ats_compatibility",
    );
    const bundle = buildPilotCareerBundleFromFields(fields);
    const analysisInput = buildSpecialistAnalysisInput({
      action: "analyze_ats_compatibility",
      fields,
      mainStack: bundle.candidate?.mainStack ?? [],
      fallbackRole: bundle.candidate?.targetRole ?? "",
    });

    expect(bundle.applications.length).toBeGreaterThan(0);
    expect(analysisInput?.jobSnapshot?.requiredRequirements.length).toBeGreaterThan(0);
    expect(analysisInput?.jobSnapshot?.keywords).toContain("intermediário");
  });

  it("does not send resume or job text in feedback payload", async () => {
    const user = userEvent.setup();
    const feedbackSpy = vi.spyOn(careerChatClient, "submitCareerFeedback").mockResolvedValue({ ok: true });
    vi.spyOn(careerChatClient, "runCareerChatLibrechat").mockResolvedValue({
      status: "completed",
      provider: "librechat",
      conversationId: "conv-1",
      intent: "analyze_resume",
      agentResult: {
        status: "completed",
        agent: "resume_analyst",
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
        resumeAnalysis: {
          score: 70,
          strengths: [],
          weaknesses: [],
          missingEvidence: [],
          bulletRecommendations: [],
          sectionRecommendations: [],
          risks: [],
          nextActions: [],
          reviewRequired: true,
        },
      },
      toolProposals: [],
      warnings: [],
      reviewRequired: true,
      safeForClient: true,
      hasToken: false,
      persisted: false,
      executedExternally: false,
      trace: { conversationId: "conv-1", steps: [] },
    });

    const view = render(
      <CareerChatWorkspace
        careerBundle={null}
        selectedSignalIds={[]}
        availableSignals={[]}
        pilotPresentation
        pilotIntent="analyze_resume"
        simpleInputs={{ ...EMPTY_CAREER_PILOT_SIMPLE_INPUTS, resumeText }}
        onSimpleInputsChange={() => undefined}
      />,
    );

    const panel = within(view.getByTestId("career-chat-workspace-panel"));
    await user.click(panel.getByTestId("career-chat-consent-checkbox"));
    await user.click(panel.getByTestId("career-chat-send-button"));

    await waitFor(() => {
      expect(panel.getByTestId("career-pilot-result-view")).toBeTruthy();
    });

    await user.click(panel.getByTestId("career-pilot-feedback-helpful"));
    await user.click(panel.getByTestId("career-pilot-feedback-consent"));
    await user.click(panel.getByTestId("career-pilot-feedback-submit"));

    await waitFor(() => {
      expect(feedbackSpy).toHaveBeenCalled();
    });

    const payload = JSON.stringify(feedbackSpy.mock.calls[0]?.[0] ?? {});
    expect(payload).not.toContain(resumeText);
    expect(payload).not.toMatch(/resumeText|jobDescription|resumeBullets/i);
  });

  it("does not use localStorage for pilot inputs", async () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    render(
      <CareerChatWorkspace
        careerBundle={null}
        selectedSignalIds={[]}
        availableSignals={[]}
        pilotPresentation
        pilotIntent="analyze_resume"
        simpleInputs={{ ...EMPTY_CAREER_PILOT_SIMPLE_INPUTS, resumeText }}
        onSimpleInputsChange={() => undefined}
      />,
    );

    expect(setItem).not.toHaveBeenCalled();
    setItem.mockRestore();
  });
});
