// @vitest-environment jsdom

import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { isIgnoredAutofillTarget, labelsMatch, resolveVisibleField } from "./field-control-resolver.js";

beforeAll(() => {
  const rect = {
    width: 240,
    height: 48,
    top: 0,
    left: 0,
    bottom: 48,
    right: 240,
    x: 0,
    y: 0,
    toJSON() {
      return "";
    },
  } as DOMRect;
  HTMLElement.prototype.getBoundingClientRect = function mockRect() {
    return rect;
  };
});

describe("resolveVisibleField", () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  it('resolve label[for] → number input', () => {
    document.body.innerHTML = `
      <div role="dialog" id="m">
        <label for="reacty">How many years with React?</label>
        <input id="reacty" type="number" />
      </div>`;
    const modal = document.getElementById("m") as HTMLElement;
    const r = resolveVisibleField(modal, "How many years with React?");
    expect(r?.kind).toBe("input");
    if (r?.kind === "input") expect(r.el.type).toBe("number");
  });

  it("resolve fieldset legend → radio-group", () => {
    document.body.innerHTML = `
      <div role="dialog" id="m">
        <fieldset>
          <legend>Relocation possible?</legend>
          <label><input type="radio" name="rel" value="no" /> No</label>
          <label><input type="radio" name="rel" value="yes" /> Yes</label>
        </fieldset>
      </div>`;
    const modal = document.getElementById("m") as HTMLElement;
    const r = resolveVisibleField(modal, "Relocation possible?");
    expect(r?.kind).toBe("radio-group");
    if (r?.kind === "radio-group") expect(r.inputs.length).toBe(2);
  });
});

describe("field-control-resolver helpers", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("labelsMatch ignora espaços extras e casing", () => {
    expect(labelsMatch("  Email address  ", "email ADDRESS")).toBe(true);
  });

  it("submit button e input submit são ignorados para autofill", () => {
    document.body.innerHTML = `<form id="f">
      <button type="submit" id="bs">Send</button>
      <input type="submit" id="is" value="Go" />
      <input type="text" id="ok" />
    </form>`;
    const bs = document.getElementById("bs") as HTMLButtonElement;
    const is = document.getElementById("is") as HTMLInputElement;
    const ok = document.getElementById("ok") as HTMLInputElement;
    expect(isIgnoredAutofillTarget(bs)).toBe(true);
    expect(isIgnoredAutofillTarget(is)).toBe(true);
    expect(isIgnoredAutofillTarget(ok)).toBe(false);
  });

  it("tipo hidden marcado como ignorado", () => {
    document.body.innerHTML = `<input type="hidden" id="h" />`;
    expect(isIgnoredAutofillTarget(document.getElementById("h") as HTMLElement)).toBe(true);
  });
});
