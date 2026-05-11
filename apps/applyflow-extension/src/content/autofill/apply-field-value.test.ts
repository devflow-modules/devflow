// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";

import {
  applySuggestedValueToResolved,
  findSelectOptionSafe,
  parseSuggestedYesNo,
} from "./apply-field-value.js";

describe("apply-field-value / parseSuggestedYesNo", () => {
  it('interpreta "Yes" e "No"', () => {
    expect(parseSuggestedYesNo("Yes")).toBe("yes");
    expect(parseSuggestedYesNo("No")).toBe("no");
    expect(parseSuggestedYesNo("Sim")).toBe("yes");
    expect(parseSuggestedYesNo("Não")).toBe("no");
    expect(parseSuggestedYesNo("não")).toBe("no");
  });
});

describe("applySuggestedValueToResolved (jsdom)", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("number: valor e disparos input/change", () => {
    document.body.innerHTML = `<input id="x" type="number" />`;
    const el = document.getElementById("x") as HTMLInputElement;
    let inputs = 0;
    let changes = 0;
    el.addEventListener("input", () => inputs++);
    el.addEventListener("change", () => changes++);
    const res = applySuggestedValueToResolved({ kind: "input", el }, "42");
    expect(res.ok).toBe(true);
    expect(el.value).toBe("42");
    expect(inputs).toBeGreaterThanOrEqual(1);
    expect(changes).toBeGreaterThanOrEqual(1);
  });

  it("text: valor e disparos input/change", () => {
    document.body.innerHTML = `<input id="x" type="text" />`;
    const el = document.getElementById("x") as HTMLInputElement;
    const res = applySuggestedValueToResolved({ kind: "input", el }, "Senior");
    expect(res.ok).toBe(true);
    expect(el.value).toBe("Senior");
  });

  it("textarea: valor e fluxo", () => {
    document.body.innerHTML = `<textarea id="t"></textarea>`;
    const el = document.getElementById("t") as HTMLTextAreaElement;
    const res = applySuggestedValueToResolved({ kind: "textarea", el }, "Oi\n mundo");
    expect(res.ok).toBe(true);
    expect(el.value).toBe("Oi\n mundo");
  });

  it("select: match seguro quando só uma opção coincide", () => {
    document.body.innerHTML = `
      <select id="s">
        <option value="">Pick</option>
        <option value="b">Advanced</option>
        <option value="i">Intermediate</option>
      </select>`;
    const el = document.getElementById("s") as HTMLSelectElement;
    const res = applySuggestedValueToResolved({ kind: "select", el }, "Advanced");
    expect(res.ok).toBe(true);
    expect(el.value).toBe("b");
  });

  it("select: falha sem match inequívoco", () => {
    document.body.innerHTML = `
      <select id="s">
        <option value="1">Senior Level</option>
        <option value="2">Senior Staff</option>
      </select>`;
    const el = document.getElementById("s") as HTMLSelectElement;
    const res = applySuggestedValueToResolved({ kind: "select", el }, "Senior");
    expect(res.ok).toBe(false);
    expect(res.reason).toContain("menu");
  });

  it('radio-group: marca "Yes"', () => {
    document.body.innerHTML = `
      <fieldset><legend>Relocation?</legend>
      <label><input type="radio" name="r1" value="no" /> No</label>
      <label><input type="radio" name="r1" value="yes" /> Yes</label>
      </fieldset>`;
    const y = document.querySelector('input[name="r1"][value="yes"]') as HTMLInputElement;
    const n = document.querySelector('input[name="r1"][value="no"]') as HTMLInputElement;
    const res = applySuggestedValueToResolved({ kind: "radio-group", inputs: [y, n] }, "Yes");
    expect(res.ok).toBe(true);
    expect(y.checked).toBe(true);
    expect(n.checked).toBe(false);
  });

  it('radio-group: marca "Sim"', () => {
    document.body.innerHTML = `
      <fieldset>
      <label><input type="radio" name="r2" value="sim" /> Sim</label>
      <label><input type="radio" name="r2" value="nao" /> Não</label>
      </fieldset>`;
    const sim = document.querySelector('input[name="r2"][value="sim"]') as HTMLInputElement;
    const nao = document.querySelector('input[name="r2"][value="nao"]') as HTMLInputElement;
    const res = applySuggestedValueToResolved({ kind: "radio-group", inputs: [sim, nao] }, "Não");
    expect(res.ok).toBe(true);
    expect(nao.checked).toBe(true);
  });

  it("input desativado: não aplica", () => {
    document.body.innerHTML = `<input id="d" type="text" disabled />`;
    const el = document.getElementById("d") as HTMLInputElement;
    const res = applySuggestedValueToResolved({ kind: "input", el }, "x");
    expect(res.ok).toBe(false);
    expect(el.value).toBe("");
  });

  it("input hidden: devolve não suportado", () => {
    document.body.innerHTML = `<input id="h" type="hidden" />`;
    const el = document.getElementById("h") as HTMLInputElement;
    const res = applySuggestedValueToResolved({ kind: "input", el }, "x");
    expect(res.ok).toBe(false);
  });
});

describe("findSelectOptionSafe", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("retorna opção apenas por texto igual normalizado", () => {
    document.body.innerHTML = `<select id="z"><option value="a">Bar</option><option value="b">Foo</option></select>`;
    const s = document.getElementById("z") as HTMLSelectElement;
    expect(findSelectOptionSafe(s, "Foo")?.value).toBe("b");
    expect(findSelectOptionSafe(s, "Foozzz")).toBe(null);
  });
});
