import { describe, expect, it } from "vitest";

import type { Contact } from "../contact-types.js";
import { getDueFollowUps } from "../follow-up-queue.js";

const contact: Contact = {
  id: "contact-1",
  applicationId: "application-1",
  jobId: "job-1",
  name: "Taylor Example",
  type: "recruiter",
  status: "SENT",
  sentAt: "2026-09-20T12:00:00.000Z",
  followUpAt: "2026-09-22T12:00:00.000Z",
  createdAt: "2026-09-20T12:00:00.000Z",
  updatedAt: "2026-09-20T12:00:00.000Z",
};

describe("outreach follow-up queue", () => {
  it("não inclui contato arquivado na fila", () => {
    const due = getDueFollowUps({
      now: new Date("2026-09-23T12:00:00.000Z"),
      contacts: [{ ...contact, archivedAt: "2026-09-21T12:00:00.000Z" }],
      interactions: [],
      plan: {
        strategyId: "test",
        steps: [
          {
            offsetDays: 2,
            targetContactType: "recruiter",
            action: "follow_up",
            condition: "no reply",
          },
        ],
        stopConditions: [],
      },
    });

    expect(due).toEqual([]);
  });
});
