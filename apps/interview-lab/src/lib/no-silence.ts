/**
 * No Silence Mode — intervalos e biblioteca de mensagens (Sprint 0.5).
 * Sem timers nos testes: apenas helpers puros.
 */

export type NoSilenceMode = "off" | "gentle" | "interview";

export const NO_SILENCE_MODE_DEFAULT: NoSilenceMode = "gentle";

/** Intervalo em segundos entre nudges automáticos (0 = desligado). */
export function getNudgeIntervalSeconds(mode: NoSilenceMode): number {
  switch (mode) {
    case "off":
      return 0;
    case "gentle":
      return 180;
    case "interview":
      return 90;
    default:
      return 0;
  }
}

export type NudgeCategory = "understanding" | "approach" | "coding" | "testing" | "recovery";

export type NudgeLine = { category: NudgeCategory; text: string };

/** Ordem estável para rotação das mensagens no cartão. */
export const NUDGE_LIBRARY: readonly NudgeLine[] = [
  { category: "understanding", text: "Restate the problem in your own words." },
  { category: "understanding", text: "Confirm the input and expected output." },
  { category: "approach", text: "Explain why this data structure fits." },
  { category: "approach", text: "Say the simplest correct approach first." },
  { category: "coding", text: "Explain what this block of code is doing." },
  { category: "coding", text: "Mention the next step before typing it." },
  { category: "testing", text: "Test with the first example." },
  { category: "testing", text: "Say one edge case out loud." },
  { category: "recovery", text: "If you are stuck, say your current assumption." },
  { category: "recovery", text: "Write pseudocode before continuing." },
] as const;

export function getNudgeMessageAtIndex(index: number): string {
  if (NUDGE_LIBRARY.length === 0) return "";
  const i = ((index % NUDGE_LIBRARY.length) + NUDGE_LIBRARY.length) % NUDGE_LIBRARY.length;
  return NUDGE_LIBRARY[i]!.text;
}

export function formatNoSilenceModeLabel(mode: NoSilenceMode): string {
  switch (mode) {
    case "off":
      return "Off";
    case "gentle":
      return "Gentle";
    case "interview":
      return "Interview";
    default:
      return String(mode);
  }
}
