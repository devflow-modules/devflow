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

  it("compara follow-up pelo instante ISO inclusive próximo à meia-noite", () => {
    const nearMidnight = contact({
      status: "SENT",
      sentAt: "2026-09-23T20:00:00.000Z",
      followUpAt: "2026-09-24T02:00:00.000Z",
    });

    expect(isOutreachFollowUpDue(nearMidnight, new Date("2026-09-24T01:59:59.999Z"))).toBe(false);
    expect(isOutreachFollowUpDue(nearMidnight, new Date("2026-09-24T02:00:00.000Z"))).toBe(true);
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

  it("preserva campos opcionais em patches parciais do lifecycle", () => {
    const original = contact({
      linkedinUrl: "https://www.linkedin.com/in/example",
      messageContent: "Draft",
      notes: "Keep me",
    });
    const prepared = updateOutreachContact(original, { status: "MESSAGE_PREPARED" }, NOW);
    const sent = markOutreachSent(prepared, {}, NOW).contact;
    const replied = recordOutreachReply(sent, {}, NOW).contact;

    for (const updated of [prepared, sent, replied]) {
      expect(updated.role).toBe(original.role);
      expect(updated.company).toBe(original.company);
      expect(updated.linkedinUrl).toBe(original.linkedinUrl);
      expect(updated.messageContent).toBe(original.messageContent);
      expect(updated.notes).toBe(original.notes);
    }
  });

  it("normaliza estados inconsistentes a partir dos timestamps para não sobrepor métricas", () => {
    const sentButPrepared = contact({
      status: "MESSAGE_PREPARED",
      sentAt: "2026-09-22T12:00:00.000Z",
    });
    const repliedButSent = contact({
      id: "replied",
      status: "SENT",
      sentAt: "2026-09-21T12:00:00.000Z",
      repliedAt: "2026-09-22T12:00:00.000Z",
    });
    const futurePersistedDue = contact({
      id: "future-due",
      status: "FOLLOW_UP_DUE",
      sentAt: "2026-09-22T12:00:00.000Z",
      followUpAt: "2026-09-24T12:00:00.000Z",
    });

    expect(effectiveOutreachStatus(sentButPrepared, NOW)).toBe("SENT");
    expect(effectiveOutreachStatus(repliedButSent, NOW)).toBe("REPLIED");
    expect(effectiveOutreachStatus(futurePersistedDue, NOW)).toBe("SENT");

    const metrics = computeOutreachMetrics([sentButPrepared, repliedButSent, futurePersistedDue], NOW);
    expect(metrics.prepared).toBe(0);
    expect(metrics.sent).toBe(3);
    expect(metrics.replied).toBe(1);
  });

  it("valida URL LinkedIn conforme o canal", () => {
    expect(validateOutreachProfileUrl("https://www.linkedin.com/in/example", "linkedin")).toBe(true);
    expect(validateOutreachProfileUrl("javascript:alert(1)", "linkedin")).toBe(false);
    expect(validateOutreachProfileUrl("https://example.com/profile", "linkedin_inmail")).toBe(false);
    expect(validateOutreachProfileUrl("https://example.com/profile", "other")).toBe(true);
  });
});
