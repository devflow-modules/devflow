/** @vitest-environment jsdom */

import { act, createElement, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { AiSettingsPanel } from "./AiSettingsPanel.js";

describe("AiSettingsPanel", () => {
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

  it("mostra estado e privacidade após carregar", async () => {
    const el = await mount(createElement(AiSettingsPanel));
    const text = el.textContent ?? "";
    expect(text).toMatch(/Estado da IA/i);
    expect(text).toMatch(/IA desactivada|desactivada/i);
    expect(text).toMatch(/Privacidade e controlo/i);
    expect(text).toMatch(/chrome\.storage\.local/i);
    expect(text).toMatch(/Activação no painel/i);
    expect(text).toMatch(/OpenAI/i);
  });
});
