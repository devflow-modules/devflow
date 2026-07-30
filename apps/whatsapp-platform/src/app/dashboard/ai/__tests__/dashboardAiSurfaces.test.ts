import { describe, expect, it, vi } from "vitest";
import {
  applySurfaceResult,
  fetchAiSurfaceData,
  initialSurface,
  surfaceError,
  surfaceReady,
} from "../dashboardAiSurfaces";
import {
  DASHBOARD_AI_NAV_TAXONOMY_DECISION,
  DASHBOARD_AI_NAV_TAXONOMY_SUMMARY,
} from "../dashboardAiNavDecision";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("applySurfaceResult", () => {
  it("sucesso total → ready com data", () => {
    expect(applySurfaceResult({ data: { n: 1 }, error: null })).toEqual(surfaceReady({ n: 1 }));
  });

  it("falha → error preservando previous", () => {
    expect(applySurfaceResult({ data: null, error: "falhou" }, { n: 2 })).toEqual(
      surfaceError("falhou", { n: 2 })
    );
  });
});

describe("fetchAiSurfaceData", () => {
  it("sucesso total", async () => {
    const fetchFn = vi.fn(async () => jsonResponse({ success: true, data: { total: 3 } }));
    const r = await fetchAiSurfaceData<{ total: number }>("/api/ai/metrics", { fetchFn });
    expect(r).toEqual({ data: { total: 3 }, error: null });
  });

  it("falha essencial (HTTP error)", async () => {
    const fetchFn = vi.fn(async () => jsonResponse({ error: "boom" }, 500));
    const r = await fetchAiSurfaceData("/api/ai/metrics", { fetchFn });
    expect(r.data).toBeNull();
    expect(r.error).toBeTruthy();
  });

  it("falha parcial: uma superfície falha, outra não (independência)", async () => {
    const fetchFn = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("funnel")) return jsonResponse({ error: "down" }, 503);
      return jsonResponse({ success: true, data: { highPending: 1, stalled: 0, negotiating: 0, reactivationQueued: 0 } });
    });

    const [funnel, opp] = await Promise.all([
      fetchAiSurfaceData("/api/ai/funnel-metrics", { fetchFn }),
      fetchAiSurfaceData("/api/ai/opportunity-metrics", { fetchFn }),
    ]);

    expect(funnel.error).toBeTruthy();
    expect(funnel.data).toBeNull();
    expect(opp.error).toBeNull();
    expect(opp.data).toMatchObject({ highPending: 1 });
  });

  it("logs: array vazio é sucesso", async () => {
    const fetchFn = vi.fn(async () => jsonResponse({ success: true, data: [] }));
    const r = await fetchAiSurfaceData<unknown[]>("/api/ai/logs", {
      fetchFn,
      allowEmptyArray: true,
    });
    expect(r).toEqual({ data: [], error: null });
  });

  it("retry localizado: segunda chamada recupera após falha", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ error: "tmp" }, 500))
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { ok: true } }));

    const first = await fetchAiSurfaceData<{ ok: boolean }>("/api/ai/metrics", { fetchFn });
    expect(first.error).toBeTruthy();

    const second = await fetchAiSurfaceData<{ ok: boolean }>("/api/ai/metrics", { fetchFn });
    expect(second).toEqual({ data: { ok: true }, error: null });
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });
});

describe("initialSurface", () => {
  it("começa em loading", () => {
    expect(initialSurface()).toEqual({ status: "loading", data: null, error: null });
  });
});

describe("DASHBOARD_AI_NAV_TAXONOMY_DECISION", () => {
  it("KEEP sem mudança a platformNav nesta F4", () => {
    expect(DASHBOARD_AI_NAV_TAXONOMY_DECISION).toBe("KEEP");
    expect(DASHBOARD_AI_NAV_TAXONOMY_SUMMARY).toMatch(/KEEP/i);
  });
});
