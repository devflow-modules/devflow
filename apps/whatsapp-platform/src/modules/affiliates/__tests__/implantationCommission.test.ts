import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { commissionBaseFromTenant, getImplantationBaseBrl } from "../implantationCommission";

function setEnv(key: string, value: string | undefined) {
  const env = process.env as Record<string, string | undefined>;
  if (value === undefined) delete env[key];
  else env[key] = value;
}

describe("getImplantationBaseBrl", () => {
  const orig = process.env.AFFILIATE_IMPLANTATION_BASE_BRL;

  beforeEach(() => {
    delete (process.env as Record<string, string | undefined>).AFFILIATE_IMPLANTATION_BASE_BRL;
  });

  afterEach(() => {
    setEnv("AFFILIATE_IMPLANTATION_BASE_BRL", orig);
  });

  it("usa default 3500 sem env", () => {
    expect(getImplantationBaseBrl()).toBe(3500);
  });

  it("respeita AFFILIATE_IMPLANTATION_BASE_BRL", () => {
    setEnv("AFFILIATE_IMPLANTATION_BASE_BRL", "5000");
    expect(getImplantationBaseBrl()).toBe(5000);
  });

  it("ignora valor inválido", () => {
    setEnv("AFFILIATE_IMPLANTATION_BASE_BRL", "0");
    expect(getImplantationBaseBrl()).toBe(3500);
    setEnv("AFFILIATE_IMPLANTATION_BASE_BRL", "x");
    expect(getImplantationBaseBrl()).toBe(3500);
  });
});

describe("commissionBaseFromTenant", () => {
  it("aceita preço positivo", () => {
    expect(commissionBaseFromTenant(1000)).toBe(1000);
  });

  it("rejeita null, zero e negativos", () => {
    expect(commissionBaseFromTenant(null)).toBeNull();
    expect(commissionBaseFromTenant(undefined)).toBeNull();
    expect(commissionBaseFromTenant(0)).toBeNull();
    expect(commissionBaseFromTenant(-1)).toBeNull();
  });
});
