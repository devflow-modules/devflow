/** @vitest-environment jsdom */

import { act, createElement, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { gustavoProfile } from "@devflow/applyflow-core";
import { afterEach, describe, expect, it } from "vitest";

import { OptionsProfileSummary } from "./OptionsProfileSummary.js";

describe("OptionsProfileSummary", () => {
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

  it("com perfil de referência mostra pronto e checklist", async () => {
    const el = await mount(createElement(OptionsProfileSummary, { profile: gustavoProfile }));
    const text = el.textContent ?? "";
    expect(text).toMatch(/Perfil pronto para sugestões/i);
    expect(text).toMatch(/Local-first/i);
    expect(text).toMatch(/chrome\.storage\.local/i);
  });
});
