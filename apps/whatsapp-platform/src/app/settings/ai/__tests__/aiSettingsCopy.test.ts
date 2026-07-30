import { describe, expect, it } from "vitest";
import {
  AI_SETTINGS_GOAL_FIELD_LABEL,
  AI_SETTINGS_PLAYBOOK_DETAILS_SUMMARY,
} from "../aiSettingsCopy";

describe("aiSettingsCopy (settings-ai F3)", () => {
  it("objetivo usa copy de workspace, não canal", () => {
    expect(AI_SETTINGS_GOAL_FIELD_LABEL).toMatch(/workspace/i);
    expect(AI_SETTINGS_GOAL_FIELD_LABEL).not.toMatch(/neste canal/i);
  });

  it("playbook summary marca o bloco como opcional", () => {
    expect(AI_SETTINGS_PLAYBOOK_DETAILS_SUMMARY).toMatch(/opcional/i);
    expect(AI_SETTINGS_PLAYBOOK_DETAILS_SUMMARY).toMatch(/playbook/i);
  });
});
