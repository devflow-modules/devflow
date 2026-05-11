import type { AiTextTask } from "@devflow/applyflow-core";

export type AiAvailability = "ok" | "disabled" | "no_key";

export type PanelAiBundle = {
  availability: AiAvailability;
  language: "pt" | "en";
  runTask: (
    task: AiTextTask,
    ctx: { questionLabel?: string; visibleQuestionText?: string },
  ) => Promise<{ ok: boolean; text?: string; reason?: string }>;
};
