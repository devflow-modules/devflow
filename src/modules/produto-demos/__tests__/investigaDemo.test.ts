import { describe, it, expect } from "vitest";
import {
  getInvestigaDemoSample,
  INVESTIGA_DEMO_CNPJ_DIGITS,
  CONSULTA_PREFILL_DEMO_DISPLAY,
  isValidCnpjLength,
} from "../investigaDemo";

describe("investigaDemo", () => {
  it("getInvestigaDemoSample retorna shape completo e ilustrativo", () => {
    const s = getInvestigaDemoSample();
    expect(s.isIllustrative).toBe(true);
    expect(s.company_name.length).toBeGreaterThan(5);
    expect(s.status).toBeTruthy();
    expect(s.main_activity).toContain("Transporte");
  });

  it("isValidCnpjLength valida 14 dígitos", () => {
    expect(isValidCnpjLength(INVESTIGA_DEMO_CNPJ_DIGITS)).toBe(true);
    expect(isValidCnpjLength("123")).toBe(false);
  });

  it("CONSULTA_PREFILL_DEMO_DISPLAY tem 14 dígitos ao normalizar", () => {
    const d = CONSULTA_PREFILL_DEMO_DISPLAY.replace(/\D/g, "");
    expect(d.length).toBe(14);
  });
});
