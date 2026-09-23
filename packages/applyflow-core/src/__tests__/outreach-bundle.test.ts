import { describe, expect, it } from "vitest";

import {
  createApplyFlowCareerBundleV2,
  parseApplyFlowCareerBundle,
  serializeApplyFlowCareerBundleV2,
} from "../career-bundle-v2.js";

describe("outreach bundle", () => {
  it("preserva campos manuais de outreach no round-trip local", () => {
    const bundle = createApplyFlowCareerBundleV2({
      contacts: [
        {
          id: "contact-1",
          applicationId: "application-1",
          jobId: "job-1",
          company: "Example Labs",
          name: "Alex Morgan",
          role: "Talent Partner",
          type: "talent_partner",
          channel: "linkedin_inmail",
          language: "EN",
          linkedinUrl: "https://www.linkedin.com/in/example",
          email: "alex@example.test",
          status: "SENT",
          subject: "Application",
          messageContent: "Hello",
          sentAt: "2026-09-23T12:00:00.000Z",
          followUpAt: "2026-09-30T12:00:00.000Z",
          inMailCreditConsumed: true,
          inMailCredits: 1,
          notes: "Waiting for reply",
          createdAt: "2026-09-23T12:00:00.000Z",
          updatedAt: "2026-09-23T12:00:00.000Z",
        },
      ],
      interactions: [
        {
          id: "interaction-1",
          contactId: "contact-1",
          applicationId: "application-1",
          jobId: "job-1",
          type: "message",
          channel: "linkedin_inmail",
          subject: "Application",
          occurredAt: "2026-09-23T12:00:00.000Z",
          content: "Hello",
        },
      ],
    });
    const parsed = parseApplyFlowCareerBundle(serializeApplyFlowCareerBundleV2(bundle));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.bundle.contacts).toEqual(bundle.contacts);
    expect(parsed.bundle.interactions).toEqual(bundle.interactions);
  });
});
