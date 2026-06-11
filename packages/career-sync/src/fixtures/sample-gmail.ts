import type { RawGmailMessageLike } from "../shared/types.js";

export const sampleRecruiterEmail: RawGmailMessageLike = {
  id: "gmail-recruiter-001",
  from: "Maria Silva <maria.silva@acme.com>",
  subject: "Recruiter screening — Software Engineer",
  snippet: "Olá! Sou recruiter da Acme e gostaria de agendar uma triagem inicial.",
  receivedAt: "2026-06-01T10:00:00.000Z",
};

export const sampleInterviewInviteEmail: RawGmailMessageLike = {
  id: "gmail-interview-001",
  from: "talent@acme.com",
  subject: "Interview invite — Backend Engineer",
  snippet: "Please confirm your availability for an interview next week. Reply to schedule.",
  receivedAt: "2026-06-02T14:30:00.000Z",
};

export const sampleRejectionEmail: RawGmailMessageLike = {
  id: "gmail-reject-001",
  from: "noreply@greenhouse.io",
  subject: "Update on your application",
  snippet: "Infelizmente não avançaremos com sua candidatura neste momento.",
  receivedAt: "2026-06-03T09:15:00.000Z",
};

export const sampleTechnicalAssignmentEmail: RawGmailMessageLike = {
  id: "gmail-tech-001",
  from: "engineering@startup.io",
  subject: "Technical assignment — complete by Friday",
  snippet: "Please complete the coding desafio and submit via our portal.",
  receivedAt: "2026-06-04T11:00:00.000Z",
};
