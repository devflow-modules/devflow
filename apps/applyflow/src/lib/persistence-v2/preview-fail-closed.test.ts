import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const recorded = vi.hoisted(() => ({ prisma: [] as string[], supabase: [] as string[] }));

vi.mock("@prisma/client", () => {
  class PrismaClient {
    constructor() {
      recorded.prisma.push("construct");
      return new Proxy(this, {
        get(_target, model) {
          if (typeof model !== "string" || model === "then") return undefined;
          return new Proxy(
            {},
            {
              get(_delegate, operation) {
                return async (args?: { create?: Record<string, unknown> }) => {
                  recorded.prisma.push(`${model}.${String(operation)}`);
                  const now = new Date("2026-10-27T15:00:00.000Z");
                  return {
                    id: "00000000-0000-4000-8000-000000000001",
                    authProviderSub: args?.create?.authProviderSub ?? "synthetic-sub",
                    email: null,
                    pilotEligible: false,
                    canonicalPersistence: "v1_local",
                    createdAt: now,
                    updatedAt: now,
                  };
                };
              },
            },
          );
        },
      });
    }
  }
  return { PrismaClient };
});

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => {
    recorded.supabase.push("createServerClient");
    return {
      auth: {
        getUser: async () => {
          recorded.supabase.push("auth.getUser");
          return { data: { user: { id: "synthetic-sub-0001", email: "synthetic@example.invalid" } }, error: null };
        },
      },
    };
  },
}));

const SECRET_NAMES = [
  "DATABASE_URL",
  "DIRECT_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "THEIRSTACK_API_KEY",
  "APPLYFLOW_THEIRSTACK_ENABLED",
  "NANGO_SECRET_KEY",
  "OPENAI_API_KEY",
  "LIBRECHAT_API_KEY",
  "OPENCLAW_API_KEY",
  "APPLYFLOW_E2E",
  "APPLYFLOW_E2E_SECRET",
  "POSTGRES_URL",
  "SUPABASE_DB_URL",
] as const;

const SYNTHETIC_SUPABASE_URL = "https://preview-synthetic.supabase.invalid";
const SYNTHETIC_REMOTE_DB = "postgresql://synthetic_user:synthetic_pass@db.preview-synthetic.invalid:5432/applyflow";

function previewWithoutCredentials(extra: Record<string, string> = {}) {
  for (const name of SECRET_NAMES) vi.stubEnv(name, undefined);
  vi.stubEnv("VERCEL", "1");
  vi.stubEnv("VERCEL_ENV", "preview");
  vi.stubEnv("APPLYFLOW_PERSISTENCE_V2", "false");
  for (const [name, value] of Object.entries(extra)) vi.stubEnv(name, value);
}

async function meRoute() {
  return import("@/app/api/applyflow/v2/me/route");
}

describe("Preview fail-closed (synthetic, no remote resources)", () => {
  beforeEach(() => {
    vi.resetModules();
    recorded.prisma.length = 0;
    recorded.supabase.length = 0;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("S01/I20I — no database configuration: no client, no fallback, controlled failure", async () => {
    previewWithoutCredentials();
    const { applyflowPrisma } = await import("./db");
    const { ApplyFlowRuntimeDbDeniedError } = await import("./runtime-db-guard");
    expect(() => applyflowPrisma.applyFlowAccount).toThrow(ApplyFlowRuntimeDbDeniedError);
    const { probeApplyFlowDatabaseReachable } = await import("./db-health");
    await expect(probeApplyFlowDatabaseReachable({ ...process.env, DATABASE_URL: SYNTHETIC_REMOTE_DB })).resolves.toBe(false);
    expect(recorded.prisma).toEqual([]);
  });

  it("S02 — no Supabase configuration: auth unavailable, no session, no account upsert", async () => {
    previewWithoutCredentials();
    const { GET } = await meRoute();
    const response = await GET();
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ error: "auth_not_configured" });
    expect(recorded.supabase).toEqual([]);
    expect(recorded.prisma).toEqual([]);
  });

  it("S03 — persistence flag off does not stop /v2/me from writing; the runtime guard does", async () => {
    previewWithoutCredentials({
      NEXT_PUBLIC_SUPABASE_URL: SYNTHETIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_synthetic",
      DATABASE_URL: SYNTHETIC_REMOTE_DB,
    });
    const preview = await (await meRoute()).GET();
    expect(preview.status).toBe(500);
    await expect(preview.json()).resolves.toEqual({ error: "internal_error" });
    expect(recorded.prisma).toEqual([]);

    vi.resetModules();
    vi.stubEnv("VERCEL", undefined);
    vi.stubEnv("VERCEL_ENV", undefined);
    const offVercel = await (await meRoute()).GET();
    expect(offVercel.status).toBe(200);
    expect(recorded.prisma).toEqual(["construct", "applyFlowAccount.upsert"]);
  });

  it("S04 — missing provider keys keep paid and external providers unavailable", async () => {
    previewWithoutCredentials({ APPLYFLOW_THEIRSTACK_ENABLED: "true", CAREER_LLM_ENABLED: "true", CAREER_LLM_PROVIDER: "openai" });
    const { isTheirStackSearchEnabled } = await import("@/lib/job-sources/theirstack-access");
    const { nangoRuntimeNeedsCaller } = await import("@/lib/provider-runtime/nango-route-caller");
    const { resolveCareerLlmProviderConfig } = await import("@/lib/career-llm/career-llm-boundary");
    expect(isTheirStackSearchEnabled()).toBe(false);
    expect(
      nangoRuntimeNeedsCaller({
        ...process.env,
        CAREER_PROVIDER_RUNTIME_ENABLED: "true",
        NANGO_RUNTIME_ENABLED: "true",
        GMAIL_PROVIDER_ENABLED: "true",
      }),
    ).toBe(false);
    expect(resolveCareerLlmProviderConfig()).toMatchObject({ provider: "openai", configured: false });
  });

  it("S05 — synthetic extension bearer without configuration: no DB lookup, predictable error", async () => {
    previewWithoutCredentials();
    const { resolveApplyFlowAccountFromRequest } = await import("./auth/resolve-account-from-request");
    const request = new Request("https://preview.example.invalid/api/applyflow/v2/jobs", {
      headers: { authorization: "Bearer synthetic-extension-grant" },
    });
    const failure = await resolveApplyFlowAccountFromRequest(request).catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(Error);
    expect((failure as Error).name).toBe("ApplyFlowRuntimeDbDeniedError");
    expect((failure as Error).message).not.toMatch(/:\/\/|synthetic_pass|synthetic-extension-grant/);
    expect(recorded.prisma).toEqual([]);
    expect(recorded.supabase).toEqual([]);
  });

  it("S06 — alternate credential names are never used as a datasource", async () => {
    previewWithoutCredentials({ POSTGRES_URL: SYNTHETIC_REMOTE_DB, SUPABASE_DB_URL: SYNTHETIC_REMOTE_DB, DIRECT_URL: SYNTHETIC_REMOTE_DB });
    const { applyflowPrisma } = await import("./db");
    expect(() => applyflowPrisma.applyFlowJob).toThrow(/runtime database is disabled/);
    const { resolveApplyFlowRuntimeDbAccess } = await import("./runtime-db-guard");
    expect(resolveApplyFlowRuntimeDbAccess()).toMatchObject({ allowed: false, targetKind: "missing" });
    expect(recorded.prisma).toEqual([]);
  });
});
