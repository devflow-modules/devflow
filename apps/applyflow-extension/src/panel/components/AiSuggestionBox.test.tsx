/** @vitest-environment jsdom */

import { act, createElement, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { AiSuggestionBox } from "./AiSuggestionBox.js";

describe("AiSuggestionBox", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  async function mount(node: ReactElement) {
    const el = document.createElement("div");
    document.body.appendChild(el);
    const root = createRoot(el);
    await act(async () => {
      root.render(node);
    });
    return el;
  }

  it("estado IA desactivada", async () => {
    const el = await mount(
      createElement(AiSuggestionBox, {
        task: "open_answer",
        availability: "disabled",
        onRun: async () => {},
        generatedText: "",
        busy: false,
        onCopy: () => {},
        onClear: () => {},
      }),
    );
    expect(el.textContent).toMatch(/IA desactivada|desactivada nas opções/i);
  });

  it("estado sem API key", async () => {
    const el = await mount(
      createElement(AiSuggestionBox, {
        task: "open_answer",
        availability: "no_key",
        onRun: async () => {},
        generatedText: "",
        busy: false,
        onCopy: () => {},
        onClear: () => {},
      }),
    );
    expect(el.textContent).toMatch(/Configure a API key|API key OpenAI/i);
  });
});
