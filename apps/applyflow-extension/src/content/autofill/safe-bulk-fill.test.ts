import { describe, expect, it } from "vitest";

import type { PreparedField } from "@devflow/applyflow-core";

import { isSafeBulkFillField, selectSafeBulkFillTargets } from "./safe-bulk-fill.js";

function field(partial: Partial<PreparedField> & Pick<PreparedField, "fieldId" | "label" | "classificationType">): PreparedField {
  return {
    source: "candidate_fact",
    confidence: "high",
    status: "ready",
    suggestedValue: "5",
    ...partial,
  };
}

describe("selectSafeBulkFillTargets", () => {
  it("12. bulk fill nunca toca submit", () => {
    const targets = selectSafeBulkFillTargets([
      field({
        fieldId: "ok",
        label: "Years of React",
        classificationType: "years_experience:react",
      }),
      field({
        fieldId: "sub",
        label: "Submit application",
        classificationType: "submit",
        status: "ready",
        suggestedValue: "Send",
      }),
    ]);
    expect(targets.map((t) => t.classificationType)).toEqual(["years_experience:react"]);
    expect(targets.some((t) => /submit/i.test(t.classificationType) || /submit/i.test(t.label))).toBe(false);
  });

  it("13. bulk fill nunca toca next", () => {
    const targets = selectSafeBulkFillTargets([
      field({
        fieldId: "nxt",
        label: "Next",
        classificationType: "next",
        suggestedValue: "Continue",
      }),
      field({
        fieldId: "cont",
        label: "Continue",
        classificationType: "continue",
        suggestedValue: "Go",
      }),
    ]);
    expect(targets).toEqual([]);
  });

  it("14. bulk fill não preenche unknown", () => {
    const targets = selectSafeBulkFillTargets([
      field({
        fieldId: "unk",
        label: "Mystery",
        classificationType: "unknown",
        suggestedValue: "guess",
        status: "needs_review",
      }),
      field({
        fieldId: "unk2",
        label: "Mystery 2",
        classificationType: "unknown",
        suggestedValue: "guess",
        status: "ready",
        source: "heuristic",
      }),
    ]);
    expect(targets).toEqual([]);
    expect(isSafeBulkFillField(field({ fieldId: "u", label: "x", classificationType: "unknown", suggestedValue: "1" }))).toBe(
      false,
    );
  });

  it("não inclui missing, blocked, low confidence nem source unknown", () => {
    const targets = selectSafeBulkFillTargets([
      field({ fieldId: "m", label: "Hardest challenge", classificationType: "cover_letter", status: "missing", suggestedValue: undefined, source: "unknown" }),
      field({ fieldId: "b", label: "Submit", classificationType: "submit", status: "blocked" }),
      field({ fieldId: "l", label: "Open", classificationType: "cover_letter", confidence: "low", status: "needs_review", suggestedValue: "hmm" }),
      field({ fieldId: "s", label: "Years of React", classificationType: "years_experience", suggestedValue: "5" }),
    ]);
    expect(targets).toHaveLength(1);
    expect(targets[0]?.fieldId).toBe("s");
  });
});
