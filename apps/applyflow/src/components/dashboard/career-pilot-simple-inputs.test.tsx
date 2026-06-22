// @vitest-environment jsdom
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CareerPilotSimpleInputsForm } from "./career-pilot-simple-inputs-form";
import { CareerPilotInputReview } from "./career-pilot-input-review";
import { EMPTY_SPECIALIST_FIELDS } from "./career-chat-workspace";
import {
  CAREER_PILOT_REVIEW_DISCLOSURE_TITLE,
  CAREER_PILOT_SIMPLE_INPUT_PRIVACY,
  CAREER_PILOT_SIMPLE_JOB_LABEL,
  CAREER_PILOT_SIMPLE_RESUME_LABEL,
  CAREER_PILOT_SIMPLE_TARGET_ROLE_LABEL,
} from "./career-pilot-simple-input-content";
import { EMPTY_CAREER_PILOT_SIMPLE_INPUTS } from "./career-pilot-simple-inputs";

describe("CareerPilotSimpleInputsForm", () => {
  beforeEach(() => cleanup());
  afterEach(() => cleanup());
  it("shows Portuguese resume fields for analyze_resume", () => {
    render(
      <CareerPilotSimpleInputsForm
        intent="analyze_resume"
        value={EMPTY_CAREER_PILOT_SIMPLE_INPUTS}
        onChange={() => undefined}
      />,
    );

    expect(screen.getByText(CAREER_PILOT_SIMPLE_TARGET_ROLE_LABEL)).toBeTruthy();
    expect(screen.getByText(CAREER_PILOT_SIMPLE_RESUME_LABEL)).toBeTruthy();
    expect(screen.getByTestId("career-pilot-resume-text")).toBeTruthy();
    expect(screen.getByText(CAREER_PILOT_SIMPLE_INPUT_PRIVACY)).toBeTruthy();
    expect(screen.queryByText("Resume bullets")).toBeNull();
    expect(screen.queryByText("Resume skills")).toBeNull();
  });

  it("shows job description field for ATS flow", () => {
    render(
      <CareerPilotSimpleInputsForm
        intent="analyze_ats_compatibility"
        value={EMPTY_CAREER_PILOT_SIMPLE_INPUTS}
        onChange={() => undefined}
      />,
    );

    expect(screen.getByText(CAREER_PILOT_SIMPLE_JOB_LABEL)).toBeTruthy();
    expect(screen.getByTestId("career-pilot-job-description")).toBeTruthy();
    expect(screen.queryByText("Job requirements")).toBeNull();
  });

  it("calls onChange when resume text is edited", async () => {
    const user = userEvent.setup();
    let latest = EMPTY_CAREER_PILOT_SIMPLE_INPUTS;
    render(
      <CareerPilotSimpleInputsForm
        intent="analyze_resume"
        value={latest}
        onChange={(next) => {
          latest = next;
        }}
      />,
    );

    await user.type(screen.getByTestId("career-pilot-resume-text"), "Texto do currículo");
    expect(latest.resumeText.length).toBeGreaterThan(0);
  });
});

describe("CareerPilotInputReview", () => {
  beforeEach(() => cleanup());
  afterEach(() => cleanup());
  it("renders closed disclosure with Portuguese labels", () => {
    render(
      <CareerPilotInputReview
        intent="analyze_resume"
        fields={{
          ...EMPTY_SPECIALIST_FIELDS,
          resumeBullets: "Experiência A",
          resumeSkills: "TypeScript",
        }}
        onFieldChange={() => undefined}
      />,
    );

    const disclosure = screen.getByTestId("career-pilot-input-review") as HTMLDetailsElement;
    expect(disclosure.open).toBe(false);
    expect(screen.getByText(CAREER_PILOT_REVIEW_DISCLOSURE_TITLE)).toBeTruthy();
    expect(screen.getByText("Experiências e resultados")).toBeTruthy();
    expect(screen.getByText("Principais competências")).toBeTruthy();
  });

  it("updates structured fields when review inputs change", async () => {
    const user = userEvent.setup();
    let skills = "TypeScript";
    render(
      <CareerPilotInputReview
        intent="analyze_resume"
        fields={{
          ...EMPTY_SPECIALIST_FIELDS,
          resumeBullets: "Experiência A",
          resumeSkills: skills,
        }}
        onFieldChange={(field, value) => {
          if (field === "resumeSkills") {
            skills = value;
          }
        }}
      />,
    );

    const disclosure = screen.getByTestId("career-pilot-input-review");
    await user.click(disclosure.querySelector("summary")!);
    const input = screen.getByTestId("career-pilot-review-skills") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "React" } });
    expect(skills).toBe("React");
  });
});
