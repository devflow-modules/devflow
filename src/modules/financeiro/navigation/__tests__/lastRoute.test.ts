import { describe, expect, it } from "vitest";
import { FINANCEIRO_BASE_PATH, FINANCEIRO_DASHBOARD_PATH } from "../constants";
import { isPersistableFinanceiroInternalPath, normalizeResumeTargetPath } from "../lastRoute";

describe("normalizeResumeTargetPath", () => {
  it("retorna fallback para vazio ou inválido", () => {
    expect(normalizeResumeTargetPath(null)).toBe(FINANCEIRO_DASHBOARD_PATH);
    expect(normalizeResumeTargetPath("")).toBe(FINANCEIRO_DASHBOARD_PATH);
    expect(normalizeResumeTargetPath("https://evil.com")).toBe(FINANCEIRO_DASHBOARD_PATH);
    expect(normalizeResumeTargetPath("/outro/path")).toBe(FINANCEIRO_DASHBOARD_PATH);
  });

  it("aceita path interno válido", () => {
    const p = `${FINANCEIRO_BASE_PATH}/sources`;
    expect(normalizeResumeTargetPath(p)).toBe(p);
    expect(normalizeResumeTargetPath(encodeURIComponent(p))).toBe(p);
  });

  it("rejeita onboarding e landing", () => {
    expect(normalizeResumeTargetPath(`${FINANCEIRO_BASE_PATH}/onboarding`)).toBe(FINANCEIRO_DASHBOARD_PATH);
    expect(normalizeResumeTargetPath(FINANCEIRO_BASE_PATH)).toBe(FINANCEIRO_DASHBOARD_PATH);
  });

  it("fallback seguro com decode inválido", () => {
    expect(normalizeResumeTargetPath("%E0%A4%A")).toBe(FINANCEIRO_DASHBOARD_PATH);
  });
});

describe("isPersistableFinanceiroInternalPath", () => {
  it("rejeita auth, landing e onboarding", () => {
    expect(isPersistableFinanceiroInternalPath(`${FINANCEIRO_BASE_PATH}/auth`)).toBe(false);
    expect(isPersistableFinanceiroInternalPath(FINANCEIRO_BASE_PATH)).toBe(false);
    expect(isPersistableFinanceiroInternalPath(`${FINANCEIRO_BASE_PATH}/onboarding`)).toBe(false);
  });

  it("aceita dashboard e sources", () => {
    expect(isPersistableFinanceiroInternalPath(`${FINANCEIRO_BASE_PATH}/dashboard`)).toBe(true);
    expect(isPersistableFinanceiroInternalPath(`${FINANCEIRO_BASE_PATH}/sources`)).toBe(true);
  });
});
