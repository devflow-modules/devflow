import { describe, expect, it } from "vitest";
import { resolveCareerLlmTask } from "../task-mapping.js";

describe("resolveCareerLlmTask", () => {
  it("maps application_analyst to fit explanation", () => {
    const result = resolveCareerLlmTask("application_analyst", "analyze_application_fit");
    expect(result).toEqual({ ok: true, task: "generate_application_fit_explanation" });
  });

  it("maps profile_gap_analyst to gap explanation", () => {
    const result = resolveCareerLlmTask("profile_gap_analyst", "analyze_profile_gaps");
    expect(result).toEqual({ ok: true, task: "generate_profile_gap_explanation" });
  });

  it("maps interview_coach to interview preparation content", () => {
    const result = resolveCareerLlmTask("interview_coach", "prepare_interview");
    expect(result).toEqual({ ok: true, task: "generate_interview_preparation_content" });
  });

  it("blocks the orchestrator agent", () => {
    const result = resolveCareerLlmTask("career_orchestrator", "analyze_application_fit");
    expect(result).toEqual({
      ok: false,
      code: "unsupported_llm_task",
      message: expect.any(String),
    });
  });

  it("blocks agent-task mismatch", () => {
    const result = resolveCareerLlmTask("application_analyst", "prepare_interview");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("agent_task_mismatch");
    }
  });
});
