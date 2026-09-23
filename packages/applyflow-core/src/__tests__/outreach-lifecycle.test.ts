import { describe, expect, it } from "vitest";

import type { Contact } from "../contact-types.js";
import {
  computeOutreachMetrics,
  effectiveOutreachStatus,
  isOutreachFollowUpDue,
  markOutreachSent,
  recordOutreachReply,
  updateOutreachContact,
  validateOutreachProfileUrl,
} from "../outreach-lifecycle.js";

const NOW = new Date("2026-09-23T12:00:00.000Z");

function contact(overrides: Partial<Contact> = {}): Contact {
  return {
    id: "contact-1",
    applicationId: "application-1",
    jobId: "job-1",
    company: "Example Labs",
    name: "Alex Morgan",
    role: "Talent Partner",
    type: "talent_partner",
    channel: "linkedin",
    language: "EN",
    status: "IDENTIFIED",
    createdAt: "2026-09-22T12:00:00.000Z",
    updatedAt: "2026-09-22T12:00:00.000Z",
    ...overrides,
  };
}

describe("outreach lifecycle", () => {
  it("não conta MESSAGE_PREPARED como envio", () => {
    const metrics = computeOutreachMetrics([contact({ status: "MESSAGE_PREPARED" })], NOW);
    expect(metrics.sent).toBe(0);
    expect(metrics.responseRate).toBe(0);
  });

  it("marca como enviado e usa sentAt explícito", () => {
    const sentAt = "2026-09-23T10:30:00.000Z";
    const result = markOutreachSent(
      contact({ channel: "linkedin_inmail", inMailCredits: 0 }),
      { sentAt, content: "Hello" },
      NOW,
    );
    expect(result.contact.status).toBe("SENT");
    expect(result.contact.sentAt).toBe(sentAt);
    expect(result.contact.lastContactAt).toBe(sentAt);
    expect(result.contact.inMailCreditConsumed).toBe(true);
    expect(result.contact.inMailCredits).toBe(1);
    expect(result.interaction.type).toBe("message");
    expect(result.interaction.occurredAt).toBe(sentAt);
  });

  it("registra resposta, limpa follow-up e cria interação", () => {
    const result = recordOutreachReply(
      contact({
        status: "SENT",
        sentAt: "2026-09-22T12:00:00.000Z",
        followUpAt: "2026-09-23T11:00:00.000Z",
      }),
      { content: "Thanks", repliedAt: "2026-09-23T12:00:00.000Z" },
      NOW,
    );
    expect(result.contact.status).toBe("REPLIED");
    expect(result.contact.repliedAt).toBe("2026-09-23T12:00:00.000Z");
    expect(result.contact.followUpAt).toBeUndefined();
    expect(result.interaction.type).toBe("reply");
  });

  it("deriva follow-up vencido sem persistir status artificial", () => {
    const due = contact({
      status: "SENT",
      sentAt: "2026-09-22T12:00:00.000Z",
      followUpAt: "2026-09-23T11:00:00.000Z",
    });
    expect(isOutreachFollowUpDue(due, NOW)).toBe(true);
    expect(effectiveOutreachStatus(due, NOW)).toBe("FOLLOW_UP_DUE");
    expect(due.status).toBe("SENT");
  });

  it("não deixa follow-up pendente depois de resposta", () => {
    const replied = contact({
      status: "REPLIED",
      sentAt: "2026-09-22T12:00:00.000Z",
      repliedAt: "2026-09-23T09:00:00.000Z",
      followUpAt: "2026-09-23T11:00:00.000Z",
    });
    expect(isOutreachFollowUpDue(replied, NOW)).toBe(false);
  });

  it("calcula response rate sem divisão por zero e sem double counting", () => {
    expect(computeOutreachMetrics([], NOW).responseRate).toBe(0);
    const metrics = computeOutreachMetrics(
      [
        contact({ id: "prepared", status: "MESSAGE_PREPARED" }),
        contact({ id: "sent", status: "SENT", sentAt: "2026-09-22T12:00:00.000Z" }),
        contact({
          id: "replied",
          status: "CONVERSATION",
          sentAt: "2026-09-21T12:00:00.000Z",
          repliedAt: "2026-09-22T12:00:00.000Z",
        }),
      ],
      NOW,
    );
    expect(metrics.sent).toBe(2);
    expect(metrics.replied).toBe(1);
    expect(metrics.responseRate).toBe(0.5);
  });

  it("edita somente campos permitidos e atualiza updatedAt", () => {
    const updated = updateOutreachContact(
      contact(),
      { role: "Senior Talent Partner", notes: "Met at conference" },
      NOW,
    );
    expect(updated.role).toBe("Senior Talent Partner");
    expect(updated.notes).toBe("Met at conference");
    expect(updated.updatedAt).toBe(NOW.toISOString());
    expect(updated.applicationId).toBe("application-1");
  });

  it("valida URL LinkedIn conforme o canal", () => {
    expect(validateOutreachProfileUrl("https://www.linkedin.com/in/example", "linkedin")).toBe(true);
    expect(validateOutreachProfileUrl("javascript:alert(1)", "linkedin")).toBe(false);
    expect(validateOutreachProfileUrl("https://example.com/profile", "linkedin_inmail")).toBe(false);
    expect(validateOutreachProfileUrl("https://example.com/profile", "other")).toBe(true);
  });
});
