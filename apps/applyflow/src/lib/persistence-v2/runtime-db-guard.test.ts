import { describe, expect, it } from "vitest";

import { APPLYFLOW_PRODUCTION_SUPABASE_PROJECT_REF } from "./db-target-guard";
import {
  ApplyFlowRuntimeDbDeniedError,
  createDeniedApplyFlowPrisma,
  resolveApplyFlowRuntimeDbAccess,
} from "./runtime-db-guard";

const SYNTHETIC_REMOTE = "postgresql://synthetic_user:synthetic_pass@db.preview-synthetic.invalid:5432/applyflow";
const SYNTHETIC_PRODUCTION_POOLER = `postgresql://postgres.${APPLYFLOW_PRODUCTION_SUPABASE_PROJECT_REF}:synthetic_pass@aws-0-sa-east-1.pooler.supabase.com:6543/postgres`;

describe("resolveApplyFlowRuntimeDbAccess", () => {
  it("allows Vercel Production", () => {
    expect(resolveApplyFlowRuntimeDbAccess({ VERCEL: "1", VERCEL_ENV: "production", DATABASE_URL: SYNTHETIC_PRODUCTION_POOLER })).toEqual({
      allowed: true,
      reason: "vercel_production",
    });
  });

  it("keeps local and CI runtimes unchanged", () => {
    expect(resolveApplyFlowRuntimeDbAccess({ DATABASE_URL: "postgresql://ci:ci@localhost:5434/applyflow" })).toEqual({
      allowed: true,
      reason: "off_vercel",
    });
  });

  it("denies Preview even when it points at the production project", () => {
    const access = resolveApplyFlowRuntimeDbAccess({ VERCEL: "1", VERCEL_ENV: "preview", DATABASE_URL: SYNTHETIC_PRODUCTION_POOLER });
    expect(access).toMatchObject({ allowed: false, reason: "vercel_non_production", vercelEnv: "preview", targetKind: "production" });
  });

  it("denies Preview for an unverified remote and for a missing URL", () => {
    expect(resolveApplyFlowRuntimeDbAccess({ VERCEL: "1", VERCEL_ENV: "preview", DATABASE_URL: SYNTHETIC_REMOTE })).toMatchObject({
      allowed: false,
      targetKind: "unknown_remote",
    });
    expect(resolveApplyFlowRuntimeDbAccess({ VERCEL: "1", VERCEL_ENV: "preview" })).toMatchObject({
      allowed: false,
      targetKind: "missing",
    });
  });

  it("denies Vercel Development and a Vercel runtime without a recognised environment", () => {
    expect(resolveApplyFlowRuntimeDbAccess({ VERCEL: "1", VERCEL_ENV: "development" })).toMatchObject({
      allowed: false,
      reason: "vercel_non_production",
    });
    expect(resolveApplyFlowRuntimeDbAccess({ VERCEL: "1" })).toMatchObject({
      allowed: false,
      reason: "vercel_environment_unrecognised",
      vercelEnv: "missing",
    });
    expect(resolveApplyFlowRuntimeDbAccess({ VERCEL: "1", VERCEL_ENV: "Production" })).toMatchObject({ allowed: false });
  });

  it("treats VERCEL_ENV=preview as Vercel even without VERCEL=1", () => {
    expect(resolveApplyFlowRuntimeDbAccess({ VERCEL_ENV: "preview", DATABASE_URL: SYNTHETIC_REMOTE })).toMatchObject({ allowed: false });
  });
});

describe("createDeniedApplyFlowPrisma", () => {
  const access = resolveApplyFlowRuntimeDbAccess({ VERCEL: "1", VERCEL_ENV: "preview", DATABASE_URL: SYNTHETIC_PRODUCTION_POOLER });
  if (access.allowed) throw new Error("expected denial");

  it("throws before any model or raw query is reached", () => {
    const client = createDeniedApplyFlowPrisma<{ applyFlowAccount: unknown; $queryRaw: unknown }>(access);
    expect(() => client.applyFlowAccount).toThrow(ApplyFlowRuntimeDbDeniedError);
    expect(() => client.$queryRaw).toThrow(ApplyFlowRuntimeDbDeniedError);
  });

  it("is not thenable and its error carries no connection details", () => {
    const client = createDeniedApplyFlowPrisma<Record<string, unknown>>(access);
    expect((client as { then?: unknown }).then).toBeUndefined();
    let message = "";
    try {
      void client.applyFlowAccount;
    } catch (error) {
      message = error instanceof Error ? error.message : "";
    }
    expect(message).toMatch(/preview/);
    expect(message).not.toMatch(/postgres|pooler|synthetic_pass|:\/\//i);
    expect(message).not.toContain(APPLYFLOW_PRODUCTION_SUPABASE_PROJECT_REF);
  });
});
