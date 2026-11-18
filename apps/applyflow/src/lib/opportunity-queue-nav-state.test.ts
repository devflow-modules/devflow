import { beforeEach, describe, expect, it } from "vitest";

import {
  DEFAULT_OPPORTUNITY_QUEUE_FILTERS,
  OPPORTUNITY_QUEUE_NAV_STORAGE_KEY,
  consumeOpportunityQueueAnchor,
  hasOpportunityQueueAnchor,
  markOpportunityQueueAnchor,
  parseOpportunityQueueNavState,
  readOpportunityQueueNavState,
  saveOpportunityQueueFilters,
} from "./opportunity-queue-nav-state";

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    key(index: number) {
      return [...map.keys()][index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, String(value));
    },
  };
}

describe("opportunity-queue-nav-state", () => {
  let storage: Storage;

  beforeEach(() => {
    storage = memoryStorage();
  });

  it("parses filters and ignores invalid or personal-looking fields", () => {
    const parsed = parseOpportunityQueueNavState(
      JSON.stringify({
        view: "ignored",
        sort: "recency",
        decision: "stretch",
        source: "remoteok",
        anchorJobId: "job_abc-123",
        email: "user@example.com",
        candidateName: "Ada",
      }),
    );
    expect(parsed).toEqual({
      view: "ignored",
      sort: "recency",
      decision: "stretch",
      source: "remoteok",
      anchorJobId: "job_abc-123",
    });
    expect(JSON.stringify(parsed)).not.toMatch(/user@example|Ada/);
  });

  it("falls back to defaults for invalid enums and drops bad anchors", () => {
    expect(
      parseOpportunityQueueNavState(
        JSON.stringify({ view: "nope", sort: "x", decision: "y", source: "z", anchorJobId: "bad id" }),
      ),
    ).toEqual(DEFAULT_OPPORTUNITY_QUEUE_FILTERS);
  });

  it("saves filters, marks anchor, and consumes it once", () => {
    saveOpportunityQueueFilters(
      { view: "all", sort: "recency", decision: "apply", source: "paste" },
      storage,
    );
    markOpportunityQueueAnchor("job_keep_me", storage);
    expect(hasOpportunityQueueAnchor("job_keep_me", storage)).toBe(true);
    expect(readOpportunityQueueNavState(storage)).toMatchObject({
      view: "all",
      sort: "recency",
      decision: "apply",
      source: "paste",
      anchorJobId: "job_keep_me",
    });

    expect(consumeOpportunityQueueAnchor(storage)).toBe("job_keep_me");
    expect(consumeOpportunityQueueAnchor(storage)).toBeNull();
    expect(readOpportunityQueueNavState(storage)).toEqual({
      view: "all",
      sort: "recency",
      decision: "apply",
      source: "paste",
    });
    expect(storage.getItem(OPPORTUNITY_QUEUE_NAV_STORAGE_KEY)).toContain('"view":"all"');
  });

  it("keeps pending anchor when filters change", () => {
    markOpportunityQueueAnchor("job_anchor", storage);
    saveOpportunityQueueFilters(
      { view: "ignored", sort: "match", decision: "all", source: "all" },
      storage,
    );
    expect(readOpportunityQueueNavState(storage)?.anchorJobId).toBe("job_anchor");
    expect(readOpportunityQueueNavState(storage)?.view).toBe("ignored");
  });
});
