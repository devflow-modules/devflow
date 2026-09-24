import { afterEach, describe, expect, it } from "vitest";

import {
  resolveApplyFlowPersistenceConfig,
  resolveApplyFlowSupabasePublicConfig,
} from "./env";

describe("resolveApplyFlowSupabasePublicConfig", () => {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  afterEach(() => {
    if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    if (originalKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    else process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = originalKey;
  });

  it("reads statically referenced NEXT_PUBLIC vars from process.env by default", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
    expect(resolveApplyFlowSupabasePublicConfig()).toEqual({
      url: "https://example.supabase.co",
      publishableKey: "sb_publishable_test",
    });
  });
});

describe("resolveApplyFlowPersistenceConfig", () => {
  it("does not require infra when Persistence V2 is OFF", () => {
    const config = resolveApplyFlowPersistenceConfig({});
    expect(config.enabled).toBe(false);
    expect(config.missing).toEqual([]);
    expect(config.readyForFoundation).toBe(false);
  });

  it("lists missing vars when Persistence V2 is ON", () => {
    const config = resolveApplyFlowPersistenceConfig({ APPLYFLOW_PERSISTENCE_V2: "true" });
    expect(config.enabled).toBe(true);
    expect(config.readyForFoundation).toBe(false);
    expect(config.missing).toContain("NEXT_PUBLIC_SUPABASE_URL");
    expect(config.missing).toContain("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
    expect(config.missing).toContain("DATABASE_URL");
  });

  it("does not accept legacy NEXT_PUBLIC_SUPABASE_ANON_KEY", () => {
    const config = resolveApplyFlowPersistenceConfig({
      APPLYFLOW_PERSISTENCE_V2: "true",
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "legacy-anon",
      DATABASE_URL: "postgresql://localhost:5432/applyflow",
    });
    expect(config.readyForFoundation).toBe(false);
    expect(config.missing).toContain("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  });

  it("reports ready when public Supabase and DATABASE_URL are set", () => {
    const config = resolveApplyFlowPersistenceConfig({
      APPLYFLOW_PERSISTENCE_V2: "true",
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
      DATABASE_URL: "postgresql://localhost:5432/applyflow",
    });
    expect(config.readyForFoundation).toBe(true);
    expect(config.missing).toEqual([]);
  });
});
