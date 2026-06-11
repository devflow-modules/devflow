import type { RawCalendarEventLike } from "../shared/types.js";

export const sampleInterviewCalendarEvent: RawCalendarEventLike = {
  id: "cal-interview-001",
  summary: "Interview — Acme Backend Engineer",
  description: "Join via https://meet.google.com/abc-defg-hij",
  start: "2026-06-10T15:00:00.000Z",
  end: "2026-06-10T16:00:00.000Z",
};

export const samplePrivateCalendarEvent: RawCalendarEventLike = {
  id: "cal-private-001",
  summary: "Dentist appointment",
  description: "Routine checkup",
  start: "2026-06-11T08:00:00.000Z",
  end: "2026-06-11T09:00:00.000Z",
};
