// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it } from "vitest";

import { detectApplyProviderFromModal, normalizeApplyProviderSourceText } from "../apply-provider.js";

function mountDialog(html: string): HTMLElement {
  document.body.innerHTML = html;
  const d = document.querySelector('[role="dialog"]');
  if (!(d instanceof HTMLElement)) throw new Error("expected [role=dialog]");
  return d;
}

beforeEach(() => {
  document.body.replaceChildren();
});

describe("normalizeApplyProviderSourceText", () => {
  it("remove acentos e colapsa espaços", () => {
    expect(normalizeApplyProviderSourceText("  Candidatura  via  LinkedIn  ")).toBe("candidatura via linkedin");
  });
});

describe("detectApplyProviderFromModal", () => {
  it("Candidatura via LinkedIn → linkedin", () => {
    expect(detectApplyProviderFromModal(mountDialog(`<div role="dialog">Candidatura via LinkedIn</div>`)).provider).toBe(
      "linkedin",
    );
  });

  it("Candidatura via Workable → workable", () => {
    expect(detectApplyProviderFromModal(mountDialog(`<div role="dialog"><p>Candidatura via Workable</p></div>`)).provider).toBe(
      "workable",
    );
  });

  it("Candidatura via Lever → lever", () => {
    expect(detectApplyProviderFromModal(mountDialog(`<div role="dialog">Candidatura via Lever</div>`)).provider).toBe("lever");
  });

  it("Apply with LinkedIn → linkedin", () => {
    expect(
      detectApplyProviderFromModal(mountDialog(`<div role="dialog">Please Apply with LinkedIn to continue</div>`))
        .provider,
    ).toBe("linkedin");
  });

  it("Apply via LinkedIn → linkedin", () => {
    expect(detectApplyProviderFromModal(mountDialog(`<div role="dialog">Apply via LinkedIn</div>`)).provider).toBe(
      "linkedin",
    );
  });

  it("Application via LinkedIn → linkedin", () => {
    expect(
      detectApplyProviderFromModal(mountDialog(`<div role="dialog">Application via LinkedIn — step 1</div>`)).provider,
    ).toBe("linkedin");
  });

  it("Application via Workable → workable", () => {
    expect(
      detectApplyProviderFromModal(mountDialog(`<div role="dialog">Application via Workable</div>`)).provider,
    ).toBe("workable");
  });

  it("Application via Lever → lever", () => {
    expect(detectApplyProviderFromModal(mountDialog(`<div role="dialog">Application via Lever</div>`)).provider).toBe(
      "lever",
    );
  });

  it("Powered by Workable → workable", () => {
    expect(detectApplyProviderFromModal(mountDialog(`<div role="dialog">Powered by Workable</div>`)).provider).toBe(
      "workable",
    );
  });

  it("Powered by Lever → lever", () => {
    expect(detectApplyProviderFromModal(mountDialog(`<div role="dialog">Powered by Lever</div>`)).provider).toBe("lever");
  });

  it("modal sem texto provider → unknown", () => {
    expect(detectApplyProviderFromModal(mountDialog(`<div role="dialog"><input type="text" /></div>`)).provider).toBe(
      "unknown",
    );
  });

  it("fixture Sprint 7.6 BRQ: continua linkedin", () => {
    const dir = dirname(fileURLToPath(import.meta.url));
    const html = readFileSync(join(dir, "../__fixtures__/easy-apply-pt-brq-additional.html"), "utf-8");
    const parsed = new DOMParser().parseFromString(html, "text/html");
    const dialog = parsed.querySelector('[role="dialog"]');
    if (!(dialog instanceof HTMLElement)) throw new Error("fixture sem dialog");
    document.body.appendChild(document.importNode(dialog, true));
    const live = document.body.querySelector('[role="dialog"]') as HTMLElement;
    expect(detectApplyProviderFromModal(live).provider).toBe("linkedin");
  });
});
