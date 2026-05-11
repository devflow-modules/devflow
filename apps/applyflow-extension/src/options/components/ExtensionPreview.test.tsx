/** @vitest-environment jsdom */

import { act, createElement, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { ExtensionPreview } from "./ExtensionPreview.js";

describe("ExtensionPreview", () => {
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

  it("mostra modo demo e mensagens de segurança / local-first", async () => {
    const el = await mount(createElement(ExtensionPreview));
    const text = el.textContent ?? "";
    expect(text).toMatch(/Modo demo/i);
    expect(text).toMatch(/nenhum dado pessoal/i);
    expect(text).toMatch(/No auto-submit/i);
    expect(text).toMatch(/Local-first copilot/i);
    expect(text).toMatch(/Data stays in this browser/i);
    expect(text).toMatch(/Acme Demo/i);
    expect(text).not.toMatch(/linkedin\.com/i);
  });
});
