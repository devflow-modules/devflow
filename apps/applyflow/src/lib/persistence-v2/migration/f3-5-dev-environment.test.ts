import { afterEach, describe, expect, it } from "vitest";

import {
  APPLYFLOW_DEDICATED_DEV_DB_HOST,
  APPLYFLOW_DEDICATED_DEV_SUPABASE_HOST,
  APPLYFLOW_PRODUCTION_SUPABASE_HOST,
  assertApplyFlowDedicatedDevEnvironment,
  assertApplyFlowDestructiveDbTargetAllowed,
  classifyApplyFlowDbTarget,
} from "./f3-5-dev-environment";
import { ApplyFlowDestructiveDbTargetDeniedError } from "../db-target-guard";

describe("F3.5 DB target environment guard", () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  it("accepts local Docker PostgreSQL hosts", () => {
    process.env.DATABASE_URL = "postgresql://applyflow:applyflow_local_dev@localhost:5434/applyflow";
    process.env.DIRECT_URL = "postgresql://applyflow:applyflow_local_dev@127.0.0.1:5434/applyflow";
    process.env.APPLYFLOW_PERSISTENCE_V2 = "true";
    process.env.APPLYFLOW_DB_TARGET = "local";
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    const report = assertApplyFlowDedicatedDevEnvironment();
    expect(report.ok).toBe(true);
    expect(report.kind).toBe("safe_local");
    expect(report.dbHost).toBe("localhost");
  });

  it("rejects the former DEV / now PRODUCTION Supabase project", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = `https://${APPLYFLOW_DEDICATED_DEV_SUPABASE_HOST}`;
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "pub-test";
    // Embed production project ref the way Supabase pooler URLs do.
    process.env.DATABASE_URL =
      "postgresql://postgres.qygwhuwvilkekfkgoizb:not-a-real-secret@aws-0-sa-east-1.pooler.supabase.com:6543/postgres";
    process.env.DIRECT_URL =
      "postgresql://postgres.qygwhuwvilkekfkgoizb:not-a-real-secret@aws-0-sa-east-1.pooler.supabase.com:5432/postgres";
    process.env.APPLYFLOW_PERSISTENCE_V2 = "true";
    const report = assertApplyFlowDedicatedDevEnvironment();
    expect(report.ok).toBe(false);
    expect(report.kind).toBe("production");
    expect(JSON.stringify(report)).not.toContain("not-a-real-secret");
    expect(APPLYFLOW_DEDICATED_DEV_SUPABASE_HOST).toBe(APPLYFLOW_PRODUCTION_SUPABASE_HOST);
    void APPLYFLOW_DEDICATED_DEV_DB_HOST;
  });

  it("rejects unknown remote hosts without printing secrets", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://prod-unknown.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "pub-test";
    process.env.DATABASE_URL = "postgresql://user:not-a-real-secret@db.prod-unknown.supabase.co:5432/postgres";
    process.env.DIRECT_URL = "postgresql://user:not-a-real-secret@db.prod-unknown.supabase.co:5432/postgres";
    process.env.APPLYFLOW_PERSISTENCE_V2 = "true";
    const report = classifyApplyFlowDbTarget();
    expect(report.allowedForDestructiveTests).toBe(false);
    expect(JSON.stringify(report)).not.toContain("not-a-real-secret");
    expect(() => assertApplyFlowDestructiveDbTargetAllowed()).toThrow(
      ApplyFlowDestructiveDbTargetDeniedError,
    );
  });
});
