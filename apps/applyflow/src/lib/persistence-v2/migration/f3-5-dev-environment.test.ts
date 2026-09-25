import { afterEach, describe, expect, it } from "vitest";

import {
  APPLYFLOW_DEDICATED_DEV_DB_HOST,
  APPLYFLOW_DEDICATED_DEV_SUPABASE_HOST,
  assertApplyFlowDedicatedDevEnvironment,
} from "./f3-5-dev-environment";

describe("F3.5 dedicated DEV environment guard", () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  it("accepts the allowlisted dedicated development hosts", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = `https://${APPLYFLOW_DEDICATED_DEV_SUPABASE_HOST}`;
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "pub-test";
    process.env.DATABASE_URL = `postgresql://user:pass@${APPLYFLOW_DEDICATED_DEV_DB_HOST}:6543/postgres`;
    process.env.DIRECT_URL = `postgresql://user:pass@${APPLYFLOW_DEDICATED_DEV_DB_HOST}:5432/postgres`;
    process.env.APPLYFLOW_PERSISTENCE_V2 = "true";
    const report = assertApplyFlowDedicatedDevEnvironment();
    expect(report.ok).toBe(true);
    expect(report.supabaseHost).toBe(APPLYFLOW_DEDICATED_DEV_SUPABASE_HOST);
    expect(report.dbHost).toBe(APPLYFLOW_DEDICATED_DEV_DB_HOST);
  });

  it("rejects unknown hosts without printing secrets", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://prod-unknown.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "pub-test";
    process.env.DATABASE_URL = "postgresql://user:s3cret@db.prod-unknown.supabase.co:5432/postgres";
    process.env.DIRECT_URL = "postgresql://user:s3cret@db.prod-unknown.supabase.co:5432/postgres";
    process.env.APPLYFLOW_PERSISTENCE_V2 = "true";
    const report = assertApplyFlowDedicatedDevEnvironment();
    expect(report.ok).toBe(false);
    expect(JSON.stringify(report)).not.toContain("s3cret");
  });
});
