import { afterEach, describe, expect, it } from "vitest";

import {
  APPLYFLOW_PRODUCTION_SUPABASE_HOST,
  APPLYFLOW_PRODUCTION_SUPABASE_PROJECT_REF,
  ApplyFlowDestructiveDbTargetDeniedError,
  assertApplyFlowDestructiveDbTargetAllowed,
  classifyApplyFlowDbTarget,
} from "./db-target-guard";

describe("ApplyFlow DB target guard", () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  it("A: accepts local PostgreSQL (localhost)", () => {
    const env = {
      DATABASE_URL: "postgresql://applyflow:applyflow_local_dev@localhost:5434/applyflow",
      DIRECT_URL: "postgresql://applyflow:applyflow_local_dev@127.0.0.1:5434/applyflow",
      APPLYFLOW_DB_TARGET: "local",
    };
    const report = classifyApplyFlowDbTarget(env);
    expect(report.kind).toBe("safe_local");
    expect(report.allowedForDestructiveTests).toBe(true);
    expect(() => assertApplyFlowDestructiveDbTargetAllowed(env)).not.toThrow();
  });

  it("B: rejects production Supabase project qygwhuwvilkekfkgoizb", () => {
    const report = classifyApplyFlowDbTarget({
      NEXT_PUBLIC_SUPABASE_URL: `https://${APPLYFLOW_PRODUCTION_SUPABASE_HOST}`,
      DATABASE_URL: `postgresql://postgres.${APPLYFLOW_PRODUCTION_SUPABASE_PROJECT_REF}:x@aws-0-sa-east-1.pooler.supabase.com:6543/postgres`,
      DIRECT_URL: `postgresql://postgres.${APPLYFLOW_PRODUCTION_SUPABASE_PROJECT_REF}:x@aws-0-sa-east-1.pooler.supabase.com:5432/postgres`,
    });
    expect(report.kind).toBe("production");
    expect(report.allowedForDestructiveTests).toBe(false);
    expect(report.reason).toBe("production_project_denylisted");
  });

  it("C: rejects unknown remote PostgreSQL", () => {
    const report = classifyApplyFlowDbTarget({
      DATABASE_URL: "postgresql://user:pass@db.example-corp.internal:5432/applyflow",
      DIRECT_URL: "postgresql://user:pass@db.example-corp.internal:5432/applyflow",
    });
    expect(report.kind).toBe("unknown_remote");
    expect(report.allowedForDestructiveTests).toBe(false);
  });

  it("D: rejects unknown Supabase project", () => {
    const report = classifyApplyFlowDbTarget({
      NEXT_PUBLIC_SUPABASE_URL: "https://abcdefghijklmnop.supabase.co",
      DATABASE_URL: "postgresql://postgres:pass@db.abcdefghijklmnop.supabase.co:5432/postgres",
      DIRECT_URL: "postgresql://postgres:pass@db.abcdefghijklmnop.supabase.co:5432/postgres",
    });
    expect(report.kind).toBe("supabase_remote");
    expect(report.allowedForDestructiveTests).toBe(false);
  });

  it("E: APPLYFLOW_F3_5_E2E=1 does not bypass Production rejection", () => {
    process.env.APPLYFLOW_F3_5_E2E = "1";
    expect(() =>
      assertApplyFlowDestructiveDbTargetAllowed({
        NEXT_PUBLIC_SUPABASE_URL: `https://${APPLYFLOW_PRODUCTION_SUPABASE_HOST}`,
        DATABASE_URL: `postgresql://user:s3cret@${APPLYFLOW_PRODUCTION_SUPABASE_HOST}:5432/postgres`,
        DIRECT_URL: `postgresql://user:s3cret@${APPLYFLOW_PRODUCTION_SUPABASE_HOST}:5432/postgres`,
      }),
    ).toThrow(ApplyFlowDestructiveDbTargetDeniedError);
  });

  it("F: rejection occurs before cleanup would run (assert throws synchronously)", () => {
    let cleanupCalled = false;
    const cleanup = () => {
      cleanupCalled = true;
    };
    try {
      assertApplyFlowDestructiveDbTargetAllowed({
        DATABASE_URL: `postgresql://u:p@${APPLYFLOW_PRODUCTION_SUPABASE_HOST}:5432/postgres`,
      });
      cleanup();
    } catch (error) {
      expect(error).toBeInstanceOf(ApplyFlowDestructiveDbTargetDeniedError);
    }
    expect(cleanupCalled).toBe(false);
  });

  it("never embeds passwords in denial errors", () => {
    try {
      assertApplyFlowDestructiveDbTargetAllowed({
        DATABASE_URL: "postgresql://user:super-secret-pass@db.evil.example:5432/postgres",
      });
      expect.fail("expected denial");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      expect(message).not.toContain("super-secret-pass");
      expect(JSON.stringify(error)).not.toContain("super-secret-pass");
    }
  });
});
