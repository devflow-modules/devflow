export const CONTACT_TYPES = [
  "recruiter",
  "engineering_manager",
  "head_of_engineering",
  "cto",
  "founder",
  "employee",
  "other",
] as const;

export type ContactType = (typeof CONTACT_TYPES)[number];

export const CONTACT_STATUSES = [
  "not_contacted",
  "connection_requested",
  "connected",
  "messaged",
  "replied",
  "closed",
] as const;

export type ContactStatus = (typeof CONTACT_STATUSES)[number];

export type Contact = {
  id: string;
  companyId?: string;
  jobId?: string;
  name: string;
  role?: string;
  type: ContactType;
  linkedinUrl?: string;
  status: ContactStatus;
  lastContactAt?: string;
  nextActionAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export const CONTACT_INTERACTION_TYPES = ["connection_request", "message", "follow_up", "reply", "note"] as const;
export type ContactInteractionType = (typeof CONTACT_INTERACTION_TYPES)[number];

export type ContactInteraction = {
  id: string;
  contactId: string;
  jobId?: string;
  type: ContactInteractionType;
  occurredAt: string;
  content?: string;
  outcome?: string;
};
