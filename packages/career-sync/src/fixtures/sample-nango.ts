import type { NangoCalendarEventLike, NangoGmailMessageLike } from "../nango/types.js";

export const sampleNangoRecruiterMessage: NangoGmailMessageLike = {
  id: "nango-gmail-recruiter-001",
  threadId: "thread-recruiter-001",
  from: "Maria Silva <maria.silva@acme.com>",
  subject: "Recruiter screening — Software Engineer",
  snippet: "Olá! Sou recruiter da Acme e gostaria de agendar uma triagem inicial.",
  payload: {
    headers: [
      { name: "Date", value: "Sun, 01 Jun 2026 10:00:00 +0000" },
      { name: "From", value: "Maria Silva <maria.silva@acme.com>" },
    ],
  },
};

export const sampleNangoInterviewMessage: NangoGmailMessageLike = {
  id: "nango-gmail-interview-001",
  threadId: "thread-interview-001",
  from: "talent@acme.com",
  subject: "Interview invite — Backend Engineer",
  snippet: "Please confirm your availability for an interview next week. Reply to schedule.",
  date: "2026-06-02T14:30:00.000Z",
};

export const sampleNangoTechnicalAssignmentMessage: NangoGmailMessageLike = {
  id: "nango-gmail-tech-001",
  threadId: "thread-tech-001",
  from: "engineering@startup.io",
  subject: "Technical assignment — complete by Friday",
  snippet: "Please complete the coding desafio and submit via our portal.",
  date: "2026-06-04T11:00:00.000Z",
};

export const sampleNangoCalendarInterviewEvent: NangoCalendarEventLike = {
  id: "nango-cal-interview-001",
  summary: "Interview — Acme Backend Engineer",
  description: "Panel interview. Join via https://meet.google.com/abc-defg-hij",
  start: { dateTime: "2026-06-10T15:00:00.000Z" },
  end: { dateTime: "2026-06-10T16:00:00.000Z" },
  htmlLink: "https://www.google.com/calendar/event?eid=abc123",
  hangoutLink: "https://meet.google.com/abc-defg-hij",
};

export const sampleNangoPrivateCalendarEvent: NangoCalendarEventLike = {
  id: "nango-cal-private-001",
  summary: "Dentist appointment",
  description: "Routine checkup",
  start: { dateTime: "2026-06-11T08:00:00.000Z" },
  end: { dateTime: "2026-06-11T09:00:00.000Z" },
  htmlLink: "https://www.google.com/calendar/event?eid=private123",
};
