import { createCareerBundle } from "@devflow/career-core";
import { describe, expect, it } from "vitest";
import { parseCareerBundleFromClipboardText } from "./applyflow-clipboard-import";

describe("parseCareerBundleFromClipboardText", () => {
  it("rejects empty clipboard", () => {
    const r = parseCareerBundleFromClipboardText("   ");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("empty");
  });

  it("rejects invalid JSON", () => {
    const r = parseCareerBundleFromClipboardText("not json");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("JSON");
  });

  it("rejects JSON that is not a valid bundle", () => {
    const r = parseCareerBundleFromClipboardText("{}");
    expect(r.ok).toBe(false);
  });

  it("accepts valid bundle JSON", () => {
    const bundle = createCareerBundle([]);
    const raw = JSON.stringify(bundle);
    const r = parseCareerBundleFromClipboardText(raw);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.schemaVersion).toBe("1.0");
  });

  it("trims surrounding whitespace before parse", () => {
    const bundle = createCareerBundle([]);
    const raw = `  \n${JSON.stringify(bundle)}\n  `;
    const r = parseCareerBundleFromClipboardText(raw);
    expect(r.ok).toBe(true);
  });
});
