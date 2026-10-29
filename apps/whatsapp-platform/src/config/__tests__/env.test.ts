import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  shouldValidateProductionServerEnv,
  validateProductionServerEnv,
} from "../env";

const VALID_PROD = {
  JWT_SECRET: "x".repeat(32),
  WHATSAPP_DATABASE_URL: "postgresql://u:p@h:5432/db",
  WHATSAPP_VERIFY_TOKEN: "token-long-enough",
  NEXT_PUBLIC_WHATSAPP_APP_URL: "https://example.com",
} as const;

describe("shouldValidateProductionServerEnv", () => {
  it("exige validação em Vercel Production", () => {
    expect(
      shouldValidateProductionServerEnv({
        VERCEL: "1",
        VERCEL_ENV: "production",
        NODE_ENV: "production",
      })
    ).toBe(true);
  });

  it("não exige validação em Vercel Preview mesmo com NODE_ENV=production", () => {
    expect(
      shouldValidateProductionServerEnv({
        VERCEL: "1",
        VERCEL_ENV: "preview",
        NODE_ENV: "production",
      })
    ).toBe(false);
  });

  it("não exige validação em Vercel Development", () => {
    expect(
      shouldValidateProductionServerEnv({
        VERCEL: "1",
        VERCEL_ENV: "development",
        NODE_ENV: "production",
      })
    ).toBe(false);
  });

  it("não exige validação com VERCEL_ENV ausente/inválido sob Vercel", () => {
    expect(
      shouldValidateProductionServerEnv({
        VERCEL: "1",
        VERCEL_ENV: undefined,
        NODE_ENV: "production",
      })
    ).toBe(false);
    expect(
      shouldValidateProductionServerEnv({
        VERCEL: "1",
        VERCEL_ENV: "staging",
        NODE_ENV: "production",
      })
    ).toBe(false);
  });

  it("não exige validação com VERCEL_ENV=production sem VERCEL=1", () => {
    expect(
      shouldValidateProductionServerEnv({
        VERCEL_ENV: "production",
        NODE_ENV: "production",
      })
    ).toBe(false);
  });

  it("exige validação em local NODE_ENV=production sem sinais Vercel", () => {
    expect(
      shouldValidateProductionServerEnv({
        NODE_ENV: "production",
      })
    ).toBe(true);
  });

  it("não exige validação em local development", () => {
    expect(
      shouldValidateProductionServerEnv({
        NODE_ENV: "development",
      })
    ).toBe(false);
  });

  it("respeita SKIP_ENV_VALIDATION", () => {
    expect(
      shouldValidateProductionServerEnv({
        VERCEL: "1",
        VERCEL_ENV: "production",
        NODE_ENV: "production",
        SKIP_ENV_VALIDATION: "1",
      })
    ).toBe(false);
  });
});

describe("validateProductionServerEnv", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("não lança fora de produção local", () => {
    expect(() =>
      validateProductionServerEnv({
        NODE_ENV: "development",
      })
    ).not.toThrow();
  });

  it("lança em Vercel Production se JWT_SECRET curto", () => {
    expect(() =>
      validateProductionServerEnv({
        VERCEL: "1",
        VERCEL_ENV: "production",
        NODE_ENV: "production",
        JWT_SECRET: "short",
        WHATSAPP_DATABASE_URL: VALID_PROD.WHATSAPP_DATABASE_URL,
        WHATSAPP_VERIFY_TOKEN: VALID_PROD.WHATSAPP_VERIFY_TOKEN,
        NEXT_PUBLIC_WHATSAPP_APP_URL: VALID_PROD.NEXT_PUBLIC_WHATSAPP_APP_URL,
      })
    ).toThrow(/JWT_SECRET/);
  });

  it("lança em Vercel Production sem WHATSAPP_DATABASE_URL", () => {
    expect(() =>
      validateProductionServerEnv({
        VERCEL: "1",
        VERCEL_ENV: "production",
        NODE_ENV: "production",
        ...VALID_PROD,
        WHATSAPP_DATABASE_URL: undefined,
      })
    ).toThrow(/WHATSAPP_DATABASE_URL/);
  });

  it("aceita Vercel Production com configuração completa", () => {
    expect(() =>
      validateProductionServerEnv({
        VERCEL: "1",
        VERCEL_ENV: "production",
        NODE_ENV: "production",
        ...VALID_PROD,
      })
    ).not.toThrow();
  });

  it("permite Preview sem DB mesmo com NODE_ENV=production", () => {
    expect(() =>
      validateProductionServerEnv({
        VERCEL: "1",
        VERCEL_ENV: "preview",
        NODE_ENV: "production",
        JWT_SECRET: undefined,
        WHATSAPP_DATABASE_URL: undefined,
        WHATSAPP_VERIFY_TOKEN: undefined,
        NEXT_PUBLIC_WHATSAPP_APP_URL: undefined,
      })
    ).not.toThrow();
  });

  it("Preview com STAGING_* presentes não exige DB Production (sem fallback implícito)", () => {
    // STAGING_* are ignored by this validator — presence must not change the decision.
    expect(() =>
      validateProductionServerEnv({
        VERCEL: "1",
        VERCEL_ENV: "preview",
        NODE_ENV: "production",
        WHATSAPP_DATABASE_URL: undefined,
      })
    ).not.toThrow();
    expect(
      shouldValidateProductionServerEnv({
        VERCEL: "1",
        VERCEL_ENV: "preview",
        NODE_ENV: "production",
      })
    ).toBe(false);
  });

  it("lança em local NODE_ENV=production sem DB", () => {
    expect(() =>
      validateProductionServerEnv({
        NODE_ENV: "production",
        JWT_SECRET: VALID_PROD.JWT_SECRET,
        WHATSAPP_VERIFY_TOKEN: VALID_PROD.WHATSAPP_VERIFY_TOKEN,
        NEXT_PUBLIC_WHATSAPP_APP_URL: VALID_PROD.NEXT_PUBLIC_WHATSAPP_APP_URL,
        WHATSAPP_DATABASE_URL: undefined,
      })
    ).toThrow(/WHATSAPP_DATABASE_URL/);
  });

  it("compatível com testes via process.env stub (comportamento legado)", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(() => validateProductionServerEnv()).not.toThrow();

    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("JWT_SECRET", "short");
    vi.stubEnv("WHATSAPP_DATABASE_URL", "postgresql://u:p@h:5432/db");
    vi.stubEnv("WHATSAPP_VERIFY_TOKEN", "token-long-enough");
    vi.stubEnv("NEXT_PUBLIC_WHATSAPP_APP_URL", "https://example.com");
    // Clear any inherited Vercel marks
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("VERCEL_ENV", "");
    expect(() => validateProductionServerEnv()).toThrow(/JWT_SECRET/);
  });
});
