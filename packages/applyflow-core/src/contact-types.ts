export const CONTACT_TYPES = [
  "recruiter",
  "talent_partner",
  "hiring_manager",
  "engineering_leader",
  "engineer",
  "referral",
  "engineering_manager",
  "head_of_engineering",
  "cto",
  "founder",
  "employee",
  "other",
] as const;

export type ContactType = (typeof CONTACT_TYPES)[number];

export const OUTREACH_CHANNELS = [
  "linkedin",
  "linkedin_inmail",
  "email",
  "whatsapp",
  "referral",
  "other",
] as const;
export type OutreachChannel = (typeof OUTREACH_CHANNELS)[number];

export const OUTREACH_LANGUAGES = ["PT", "EN", "ES", "Other"] as const;
export type OutreachLanguage = (typeof OUTREACH_LANGUAGES)[number];

export const OUTREACH_STATUSES = [
  "IDENTIFIED",
  "MESSAGE_PREPARED",
  "SENT",
  "REPLIED",
  "FOLLOW_UP_DUE",
  "CONVERSATION",
  "CLOSED",
] as const;
export type OutreachStatus = (typeof OUTREACH_STATUSES)[number];

export const CONTACT_STATUSES = [
  "not_contacted",
  "connection_requested",
  "connected",
  "messaged",
  "replied",
  "closed",
  ...OUTREACH_STATUSES,
] as const;

export type ContactStatus = (typeof CONTACT_STATUSES)[number];

export type Contact = {
  id: string;
  applicationId?: string;
  companyId?: string;
  company?: string;
  jobId?: string;
  name: string;
  role?: string;
  type: ContactType;
  channel?: OutreachChannel;
  language?: OutreachLanguage;
  linkedinUrl?: string;
  email?: string;
  status: ContactStatus;
  subject?: string;
  messageContent?: string;
  sentAt?: string;
  repliedAt?: string;
  followUpAt?: string;
  inMailCreditConsumed?: boolean;
  inMailCredits?: number;
  lastContactAt?: string;
  nextActionAt?: string;
  notes?: string;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export const CONTACT_INTERACTION_TYPES = ["connection_request", "message", "follow_up", "reply", "note"] as const;
export type ContactInteractionType = (typeof CONTACT_INTERACTION_TYPES)[number];

export type ContactInteraction = {
  id: string;
  contactId: string;
  applicationId?: string;
  jobId?: string;
  type: ContactInteractionType;
  channel?: OutreachChannel;
  subject?: string;
  occurredAt: string;
  content?: string;
  outcome?: string;
};
