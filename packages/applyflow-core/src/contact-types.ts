export const CONTACT_TYPES = [
  "recruiter",
  "talent_partner",
  "talent_acquisition",
  "hiring_manager",
  "team_member",
  "product_manager",
  "people_ops",
  "vp_talent",
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

/** Product alias for contact relation to the hiring process. */
export type ContactRelation = ContactType;

export const CONTACT_CONFIDENCE_LEVELS = ["very_high", "high", "medium", "low"] as const;
export type ContactConfidence = (typeof CONTACT_CONFIDENCE_LEVELS)[number];

export const OPPORTUNITY_EVIDENCE_SOURCE_TYPES = [
  "linkedin",
  "company_careers",
  "ats",
  "manual",
  "other",
] as const;
export type OpportunityEvidenceSourceType = (typeof OPPORTUNITY_EVIDENCE_SOURCE_TYPES)[number];

/** Provenance for researched job/contact facts — never upgrades hypothesis to fact. */
export type OpportunityEvidence = {
  sourceType: OpportunityEvidenceSourceType;
  sourceUrl?: string;
  note?: string;
  verifiedAt?: string;
};

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

/** UX aliases — map onto persisted `OUTREACH_STATUSES` / legacy statuses. */
export const OUTREACH_STATUS_ALIASES = [
  "not_started",
  "ready",
  "sent",
  "connected",
  "replied",
  "follow_up_due",
  "closed",
] as const;
export type OutreachStatusAlias = (typeof OUTREACH_STATUS_ALIASES)[number];

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
  /** Human-readable relation to the process (e.g. "Hiring-side contact"). */
  relationDescription?: string;
  /** How strongly evidence supports that this person owns / is tied to the req. */
  contactConfidence?: ContactConfidence;
  /** Why this person was chosen — keep hypothesis language when unconfirmed. */
  evidenceNote?: string;
  contactEvidence?: OpportunityEvidence;
  recommendedCases?: string[];
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
  nextAction?: string;
  notes?: string;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
};

/** Contact scoped to an opportunity — alias over `Contact` (no parallel entity). */
export type OpportunityContact = Contact & { jobId: string };

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

export const CONTACT_CONFIDENCE_LABELS: Record<ContactConfidence, string> = {
  very_high: "VERY HIGH",
  high: "HIGH",
  medium: "MEDIUM",
  low: "LOW",
};

export const CONTACT_TYPE_LABELS: Record<ContactType, string> = {
  recruiter: "Recruiter",
  talent_partner: "Talent Partner",
  talent_acquisition: "Talent Acquisition",
  hiring_manager: "Hiring Manager",
  team_member: "Team / hiring-side contact",
  product_manager: "Product Manager",
  people_ops: "People Operations",
  vp_talent: "VP of Talent",
  engineering_leader: "Engineering Leader",
  engineer: "Engineer",
  referral: "Referral",
  engineering_manager: "Engineering Manager",
  head_of_engineering: "Head of Engineering",
  cto: "CTO",
  founder: "Founder",
  employee: "Employee",
  other: "Other",
};

export function isContactConfidence(value: unknown): value is ContactConfidence {
  return typeof value === "string" && (CONTACT_CONFIDENCE_LEVELS as readonly string[]).includes(value);
}

export function isOpportunityEvidenceSourceType(value: unknown): value is OpportunityEvidenceSourceType {
  return (
    typeof value === "string" && (OPPORTUNITY_EVIDENCE_SOURCE_TYPES as readonly string[]).includes(value)
  );
}

export function outreachStatusFromAlias(alias: OutreachStatusAlias): OutreachStatus {
  switch (alias) {
    case "not_started":
      return "IDENTIFIED";
    case "ready":
      return "MESSAGE_PREPARED";
    case "sent":
    case "connected":
      return "SENT";
    case "replied":
      return "REPLIED";
    case "follow_up_due":
      return "FOLLOW_UP_DUE";
    case "closed":
      return "CLOSED";
  }
}

export function outreachAliasFromStatus(status: OutreachStatus): OutreachStatusAlias {
  switch (status) {
    case "IDENTIFIED":
      return "not_started";
    case "MESSAGE_PREPARED":
      return "ready";
    case "SENT":
      return "sent";
    case "REPLIED":
    case "CONVERSATION":
      return "replied";
    case "FOLLOW_UP_DUE":
      return "follow_up_due";
    case "CLOSED":
      return "closed";
  }
}
