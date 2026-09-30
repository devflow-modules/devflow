import { describe, expect, it, vi } from "vitest";

import { requestJobSearch } from "./search-client";

describe("requestJobSearch", () => {
  it("does not send CV data to the search route", async () => {
    const fetchImpl = vi.fn<typeof fetch>();
    const blocked = await requestJobSearch(
      { keyword: "react", page: 1, limit: 10, profile: { cv: "secret resume text" } },
      fetchImpl,
    );
    expect(blocked).toEqual({ ok: false, error: "invalid_criteria" });
    expect(fetchImpl).not.toHaveBeenCalled();

    fetchImpl.mockResolvedValue(
      new Response(
        JSON.stringify({
          provider: "jobgether",
          page: 1,
          limit: 10,
          hasMore: false,
          cached: false,
          hits: [],
        }),
        { status: 200 },
      ),
    );
    const allowed = await requestJobSearch({ keyword: "react", page: 1, limit: 10 }, fetchImpl);
    expect(allowed.ok).toBe(true);
    const init = fetchImpl.mock.calls[0]?.[1];
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    expect(body).toEqual({ keyword: "react", page: 1, limit: 10 });
    expect(JSON.stringify(body)).not.toMatch(/cv|resume|profile/i);
    expect(fetchImpl.mock.calls[0]?.[0]).toBe("/api/applyflow/job-sources/search");
  });
});
