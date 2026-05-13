/** @vitest-environment jsdom */
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { parseEasyApplyModalFields } from "@devflow/applyflow-linkedin";

import { debugScanEasyApplyModals, findEasyApplyModalWithMeta } from "./easy-apply-modal.js";

const dialogRect = {
  width: 560,
  height: 720,
  top: 0,
  left: 0,
  bottom: 720,
  right: 560,
  x: 0,
  y: 0,
  toJSON() {
    return "";
  },
} as DOMRect;

const fieldRect = {
  width: 320,
  height: 44,
  top: 0,
  left: 0,
  bottom: 44,
  right: 320,
  x: 0,
  y: 0,
  toJSON() {
    return "";
  },
} as DOMRect;

const origGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;

beforeAll(() => {
  HTMLElement.prototype.getBoundingClientRect = function mockRect(this: HTMLElement) {
    if (this.getAttribute("role") === "dialog") return dialogRect;
    return fieldRect;
  };
});

afterAll(() => {
  HTMLElement.prototype.getBoundingClientRect = origGetBoundingClientRect;
});

afterEach(() => {
  document.body.replaceChildren();
});

const PT_BRQ_MODAL_HTML = `
<div role="dialog" aria-modal="true" class="artdeco-modal">
  <h2>Candidate-se na BRQ Digital Solutions</h2>
  <p>Candidatura via LinkedIn</p>
  <h3>Perguntas adicionais</h3>
  <div data-test-form-builder-modal-form-element>
    <span class="text-body-medium">Há quantos anos você já usa Amazon Web Services no trabalho?</span>
    <input type="number" name="aws-years" />
  </div>
  <div data-test-form-builder-modal-form-element>
    <span class="text-body-medium">Há quantos anos você já usa React.js no trabalho?</span>
    <input type="number" name="react-years" />
  </div>
  <footer>
    <button type="button">Voltar</button>
    <button type="button">Revisar</button>
  </footer>
</div>
`;

describe("findEasyApplyModal (Sprint 7.6)", () => {
  it("reconhece modal PT sem classes .jobs-easy-apply-modal e extrai campos", () => {
    document.body.innerHTML = PT_BRQ_MODAL_HTML;
    const meta = findEasyApplyModalWithMeta();
    expect(meta.modal).toBeTruthy();
    expect(meta.via).toBe("dialog_heuristic");
    const labels = parseEasyApplyModalFields(meta.modal!);
    expect(labels.length).toBeGreaterThanOrEqual(2);
    expect(labels).toContain("Há quantos anos você já usa Amazon Web Services no trabalho?");
    expect(labels).toContain("Há quantos anos você já usa React.js no trabalho?");
    expect(labels.some((l) => /^(Voltar|Revisar|Avançar)$/i.test(l))).toBe(false);
  });

  it("debugScanEasyApplyModals marca dialog aceite com motivo ok", () => {
    document.body.innerHTML = PT_BRQ_MODAL_HTML;
    findEasyApplyModalWithMeta();
    const { dialogCount, rows } = debugScanEasyApplyModals();
    expect(dialogCount).toBe(1);
    expect(rows[0]?.accepted).toBe(true);
    expect(rows[0]?.reason).toBe("ok");
    expect(rows[0]?.controls).toBeGreaterThanOrEqual(2);
  });
});
