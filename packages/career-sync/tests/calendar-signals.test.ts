import { describe, expect, it } from "vitest";
import {
  extractCalendarSignals,
  sampleInterviewCalendarEvent,
  samplePrivateCalendarEvent,
  shouldRetainRawProviderData,
} from "../src/index.js";

describe("extractCalendarSignals", () => {
  it("maps interview calendar event to interview", () => {
    const [signal] = extractCalendarSignals([sampleInterviewCalendarEvent]);
    expect(signal?.processStage).toBe("interview");
    expect(signal?.source).toBe("calendar");
    expect(signal?.eventAt).toBe(sampleInterviewCalendarEvent.start);
    expect(signal?.safeSummary).not.toMatch(/meet\.google\.com/i);
  });

  it("ignores private unrelated calendar events", () => {
    const signals = extractCalendarSignals([samplePrivateCalendarEvent]);
    expect(signals).toHaveLength(0);
  });

  it("never retains raw provider data", () => {
    const [signal] = extractCalendarSignals([sampleInterviewCalendarEvent]);
    expect(signal?.rawRetained).toBe(false);
    expect(shouldRetainRawProviderData()).toBe(false);
  });

  it("is deterministic", () => {
    const first = extractCalendarSignals([sampleInterviewCalendarEvent]);
    const second = extractCalendarSignals([sampleInterviewCalendarEvent]);
    expect(first).toEqual(second);
  });
});
