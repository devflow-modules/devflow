import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { validateProductionServerEnv } from "../env";

describe("validateProductionServerEnv", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("não lança fora de produção", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(() => validateProductionServerEnv()).not.toThrow();
  });

  it("lança em produção se JWT_SECRET curto", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("JWT_SECRET", "short");
    vi.stubEnv("WHATSAPP_DATABASE_URL", "postgresql://u:p@h:5432/db");
    vi.stubEnv("WHATSAPP_VERIFY_TOKEN", "token-long-enough");
    vi.stubEnv("NEXT_PUBLIC_WHATSAPP_APP_URL", "https://example.com");
    expect(() => validateProductionServerEnv()).toThrow(/JWT_SECRET/);
  });
});
