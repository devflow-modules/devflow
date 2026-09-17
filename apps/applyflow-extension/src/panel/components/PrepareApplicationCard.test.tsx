/** @vitest-environment jsdom */

import { act, createElement, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { prepareApplication, gustavoProfile } from "@devflow/applyflow-core";

import { PrepareApplicationCard } from "./PrepareApplicationCard.js";

describe("PrepareApplicationCard", () => {
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

  it("mostra match, currículo, contagens e o CTA de campos seguros", async () => {
    const preparation = prepareApplication({
      profile: gustavoProfile,
      jobText: `Senior Full Stack Engineer
Empresa X
Remote
React, TypeScript, Node.js, PostgreSQL
`,
      fields: [
        {
          fieldId: "1",
          label: "How many years of experience do you have with React?",
          classificationType: "years_experience:react",
          classificationConfidence: "high",
        },
        {
          fieldId: "2",
          label: "Submit",
          classificationType: "submit",
        },
      ],
    });
    const el = await mount(
      createElement(PrepareApplicationCard, {
        jobTitle: "Senior Full Stack Engineer",
        companyName: "Empresa X",
        preparation,
      }),
    );
    const text = el.textContent ?? "";
    expect(text).toMatch(/Preparar candidatura/i);
    expect(text).toMatch(/MATCH/i);
    expect(text).toMatch(/APPLY|REVIEW|SKIP/);
    expect(text).toMatch(/CURRÍCULO/i);
    expect(text).toMatch(/Preencher campos seguros/);
    expect(text).toMatch(/Revisar respostas/);
    expect(text).not.toMatch(/auto-submit/i);
  });
});
