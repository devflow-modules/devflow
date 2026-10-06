import { describe, expect, it } from "vitest";

import { careerEventsFromAnalyticsPayload } from "./hydrate-account-caches";

describe("careerEventsFromAnalyticsPayload", () => {
  it("keeps real transition events and drops notes or timestamps used as history", () => {
    const events = careerEventsFromAnalyticsPayload([
      {
        id: "evt-1",
        applicationId: "app-1",
        type: "screening",
        occurredAt: "2026-10-05T12:00:00.000Z",
        fromStatus: "applied",
        toStatus: "interview",
        source: "user",
      },
      { updatedAt: "2026-10-05T12:00:00.000Z", notes: "follow up" },
      null,
    ]);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ id: "evt-1", type: "screening" });
  });
});
