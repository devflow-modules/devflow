import { describe, it, expect } from "vitest";
import { isValidCpf, formatCpfDigits } from "../cpf";

describe("cpf validators", () => {
  it("formats to digits only", () => {
    expect(formatCpfDigits("123.456.789-00")).toBe("12345678900");
    expect(formatCpfDigits("12345678900")).toBe("12345678900");
  });

  it("rejects invalid length", () => {
    expect(isValidCpf("123")).toBe(false);
    expect(isValidCpf("1234567890")).toBe(false);
  });

  it("rejects same-digit CPF", () => {
    expect(isValidCpf("111.111.111-11")).toBe(false);
  });

  it("accepts valid CPF", () => {
    expect(isValidCpf("111.444.777-35")).toBe(true);
    expect(isValidCpf("11144477735")).toBe(true);
  });
});
