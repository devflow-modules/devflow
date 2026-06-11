import { describe, expect, it } from "vitest";
import {
  extractSignalsFromNangoCalendar,
  extractSignalsFromNangoGmail,
  mapNangoCalendarEvent,
  mapNangoGmailMessage,
  sampleNangoCalendarInterviewEvent,
  sampleNangoInterviewMessage,
  sampleNangoPrivateCalendarEvent,
  sampleNangoRecruiterMessage,
  sampleNangoTechnicalAssignmentMessage,
  shouldRetainRawProviderData,
} from "../src/index.js";

describe("Nango adapter sandbox", () => {
  it("maps Nango Gmail recruiter to safe RawGmailMessageLike", () => {
    const raw = mapNangoGmailMessage(sampleNangoRecruiterMessage);
    expect(raw).toEqual({
      id: "nango-gmail-recruiter-001",
      from: "Maria Silva <maria.silva@acme.com>",
      subject: "Recruiter screening — Software Engineer",
      snippet: "Olá! Sou recruiter da Acme e gostaria de agendar uma triagem inicial.",
      receivedAt: "2026-06-01T10:00:00.000Z",
    });
    expect(Object.keys(raw).sort()).toEqual(["from", "id", "receivedAt", "snippet", "subject"]);
  });

  it("maps Nango Gmail interview to interview signal", () => {
    const [signal] = extractSignalsFromNangoGmail([sampleNangoInterviewMessage]);
    expect(signal?.processStage).toBe("interview");
    expect(signal?.actionRequired).toBe(true);
    expect(signal?.source).toBe("gmail");
  });

  it("maps Nango Gmail technical assignment to technical with actionRequired", () => {
    const [signal] = extractSignalsFromNangoGmail([sampleNangoTechnicalAssignmentMessage]);
    expect(signal?.processStage).toBe("technical");
    expect(signal?.actionRequired).toBe(true);
  });

  it("maps Nango Calendar interview to interview signal", () => {
    const [signal] = extractSignalsFromNangoCalendar([sampleNangoCalendarInterviewEvent]);
    expect(signal?.processStage).toBe("interview");
    expect(signal?.source).toBe("calendar");
    expect(signal?.eventAt).toBe("2026-06-10T15:00:00.000Z");
  });

  it("does not leak calendar links into signals", () => {
    const raw = mapNangoCalendarEvent(sampleNangoCalendarInterviewEvent);
    expect(raw).not.toHaveProperty("htmlLink");
    expect(raw).not.toHaveProperty("hangoutLink");

    const [signal] = extractSignalsFromNangoCalendar([sampleNangoCalendarInterviewEvent]);
    expect(JSON.stringify(signal)).not.toMatch(/meet\.google\.com/i);
    expect(JSON.stringify(signal)).not.toMatch(/google\.com\/calendar/i);
    expect(signal?.safeSummary).not.toMatch(/https?:\/\//);
  });

  it("ignores unrelated private Nango calendar events", () => {
    const signals = extractSignalsFromNangoCalendar([sampleNangoPrivateCalendarEvent]);
    expect(signals).toHaveLength(0);
  });

  it("never retains raw provider data", () => {
    const signals = [
      ...extractSignalsFromNangoGmail([sampleNangoRecruiterMessage, sampleNangoInterviewMessage]),
      ...extractSignalsFromNangoCalendar([sampleNangoCalendarInterviewEvent]),
    ];
    for (const signal of signals) {
      expect(signal.rawRetained).toBe(false);
    }
    expect(shouldRetainRawProviderData()).toBe(false);
  });

  it("does not include body or attachments in Gmail mapper output", () => {
    const input = {
      ...sampleNangoRecruiterMessage,
      body: "<html>secret body</html>",
      attachments: [{ id: "att-1", filename: "resume.pdf" }],
    } as typeof sampleNangoRecruiterMessage & { body: string; attachments: unknown[] };

    const raw = mapNangoGmailMessage(input);
    expect(raw).not.toHaveProperty("body");
    expect(raw).not.toHaveProperty("attachments");
    expect(raw).not.toHaveProperty("threadId");
    expect(raw).not.toHaveProperty("payload");
  });

  it("is deterministic", () => {
    const first = extractSignalsFromNangoGmail([sampleNangoRecruiterMessage]);
    const second = extractSignalsFromNangoGmail([sampleNangoRecruiterMessage]);
    expect(first).toEqual(second);
  });
});
