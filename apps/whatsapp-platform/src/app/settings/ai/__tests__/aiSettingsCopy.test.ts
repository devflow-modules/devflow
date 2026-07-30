import { describe, expect, it } from "vitest";
import {
  AI_SETTINGS_GOAL_FIELD_LABEL,
  AI_SETTINGS_PLAYBOOK_DETAILS_SUMMARY,
  AI_SETTINGS_SAVE_LABEL,
  AI_SETTINGS_SAVING_LABEL,
} from "../aiSettingsCopy";

describe("aiSettingsCopy (settings-ai F3/F4)", () => {
  it("objetivo usa copy de workspace, não canal", () => {
    expect(AI_SETTINGS_GOAL_FIELD_LABEL).toMatch(/workspace/i);
    expect(AI_SETTINGS_GOAL_FIELD_LABEL).not.toMatch(/neste canal/i);
  });

  it("playbook summary marca o bloco como opcional", () => {
    expect(AI_SETTINGS_PLAYBOOK_DETAILS_SUMMARY).toMatch(/opcional/i);
    expect(AI_SETTINGS_PLAYBOOK_DETAILS_SUMMARY).toMatch(/playbook/i);
  });

  it("F4: submits unificados em Salvar (não Guardar)", () => {
    expect(AI_SETTINGS_SAVE_LABEL).toBe("Salvar alterações");
    expect(AI_SETTINGS_SAVING_LABEL).toBe("A salvar…");
    expect(AI_SETTINGS_SAVE_LABEL).not.toMatch(/Guardar/i);
    expect(AI_SETTINGS_SAVING_LABEL).not.toMatch(/guardar/i);
  });
});
