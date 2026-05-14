import { describe, expect, it } from "vitest";
import {
  EMERGENCY_SYMBOL_VALUES,
  KEYBOARD_CHECKLIST_ITEMS,
  KEYBOARD_RESCUE_SYMBOLS,
  KEYBOARD_SAFE_SNIPPETS,
} from "@/lib/keyboard-rescue";

const REQUIRED_SYMBOL_VALUES = [
  "|",
  "||",
  "&&",
  "\\",
  "/",
  "{",
  "}",
  "[",
  "]",
  "(",
  ")",
  "=>",
  "!==",
  "===",
  "<=",
  ">=",
  "`",
  "'",
  '"',
  ";",
  ":",
  "?",
  ".",
  ",",
] as const;

describe("KEYBOARD_RESCUE_SYMBOLS", () => {
  it("includes all mandatory symbol values", () => {
    const values = new Set(KEYBOARD_RESCUE_SYMBOLS.map((s) => s.value));
    for (const v of REQUIRED_SYMBOL_VALUES) {
      expect(values.has(v), `missing value: ${JSON.stringify(v)}`).toBe(true);
    }
  });

  it("has no empty values or labels", () => {
    for (const s of KEYBOARD_RESCUE_SYMBOLS) {
      expect(s.id.trim().length).toBeGreaterThan(0);
      expect(s.label.length).toBeGreaterThan(0);
      expect(s.value.length).toBeGreaterThan(0);
      expect(s.description.trim().length).toBeGreaterThan(0);
      expect(s.category.length).toBeGreaterThan(0);
    }
  });
});

describe("KEYBOARD_SAFE_SNIPPETS", () => {
  it("includes mandatory snippet ids", () => {
    const ids = new Set(KEYBOARD_SAFE_SNIPPETS.map((s) => s.id));
    expect(ids.has("snippet-frequency-map-no-or-or")).toBe(true);
    expect(ids.has("snippet-tie-breaker")).toBe(true);
    expect(ids.has("snippet-entries-sort")).toBe(true);
    expect(ids.has("snippet-async-fetch-json")).toBe(true);
    expect(ids.has("snippet-safe-default-map")).toBe(true);
  });

  it("has non-empty code for each snippet", () => {
    for (const s of KEYBOARD_SAFE_SNIPPETS) {
      expect(s.code.trim().length).toBeGreaterThan(10);
      expect(s.title.trim().length).toBeGreaterThan(0);
    }
  });
});

describe("KEYBOARD_CHECKLIST_ITEMS", () => {
  it("includes mandatory checklist labels", () => {
    const labels = KEYBOARD_CHECKLIST_ITEMS.map((i) => i.label).join(" ");
    expect(labels).toMatch(/pipe:\s*\|/);
    expect(labels).toMatch(/braces/);
    expect(labels).toMatch(/brackets/);
    expect(labels).toMatch(/arrow:\s*=>/);
    expect(labels).toMatch(/quotes/);
    expect(labels).toMatch(/copy emergency symbols/i);
    expect(labels).toMatch(/keyboard-safe frequency map snippet/i);
  });
});

describe("EMERGENCY_SYMBOL_VALUES", () => {
  it("matches quick-rescue set", () => {
    expect(EMERGENCY_SYMBOL_VALUES).toEqual(["|", "||", "&&", "\\", "{}", "[]", "=>", "!==", "==="]);
  });
});
