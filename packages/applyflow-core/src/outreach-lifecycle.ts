import type {
  Contact,
  ContactInteraction,
  ContactStatus,
  OutreachChannel,
  OutreachStatus,
} from "./contact-types.js";

export type OutreachMetrics = {
  identified: number;
  prepared: number;
  sent: number;
  replied: number;
  followUpsPending: number;
  responseRate: number;
};

export type OutreachContactPatch = Partial<
  Pick<
    Contact,
    | "name"
    | "role"
    | "company"
    | "type"
    | "channel"
    | "language"
    | "linkedinUrl"
    | "email"
    | "status"
    | "subject"
    | "messageContent"
    | "followUpAt"
    | "notes"
    | "inMailCreditConsumed"
    | "inMailCredits"
  >
>;

const STATUS_FROM_LEGACY: Record<ContactStatus, OutreachStatus> = {
  not_contacted: "IDENTIFIED",
  connection_requested: "SENT",
  connected: "SENT",
  messaged: "SENT",
  replied: "REPLIED",
  closed: "CLOSED",
  IDENTIFIED: "IDENTIFIED",
  MESSAGE_PREPARED: "MESSAGE_PREPARED",
  SENT: "SENT",
  REPLIED: "REPLIED",
  FOLLOW_UP_DUE: "FOLLOW_UP_DUE",
  CONVERSATION: "CONVERSATION",
  CLOSED: "CLOSED",
};

function timestamp(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function hasBeenSent(contact: Contact): boolean {
  if (timestamp(contact.sentAt) != null) return true;
  return ["connection_requested", "connected", "messaged", "replied", "SENT", "REPLIED", "FOLLOW_UP_DUE", "CONVERSATION"].includes(
    contact.status,
  );
}

function hasReply(contact: Contact): boolean {
  if (timestamp(contact.repliedAt) != null) return true;
  return contact.status === "replied" || contact.status === "REPLIED" || contact.status === "CONVERSATION";
}

export function normalizeOutreachStatus(status: ContactStatus): OutreachStatus {
  return STATUS_FROM_LEGACY[status];
}

export function validateOutreachProfileUrl(value: string | undefined, channel: OutreachChannel): boolean {
  if (!value?.trim()) return true;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    if (channel === "linkedin" || channel === "linkedin_inmail") {
      return url.hostname === "linkedin.com" || url.hostname.endsWith(".linkedin.com");
    }
    return true;
  } catch {
    return false;
  }
}

export function updateOutreachContact(contact: Contact, patch: OutreachContactPatch, now = new Date()): Contact {
  return {
    ...contact,
    ...patch,
    name: patch.name?.trim() || contact.name,
    role: patch.role?.trim() || undefined,
    company: patch.company?.trim() || undefined,
    linkedinUrl: patch.linkedinUrl?.trim() || undefined,
    email: patch.email?.trim() || undefined,
    subject: patch.subject?.trim() || undefined,
    messageContent: patch.messageContent?.trim() || undefined,
    notes: patch.notes?.trim() || undefined,
    updatedAt: now.toISOString(),
  };
}

export function markOutreachSent(
  contact: Contact,
  input: {
    sentAt?: string;
    content?: string;
    subject?: string;
    followUpAt?: string;
    inMailCredits?: number;
    interactionId?: string;
  } = {},
  now = new Date(),
): { contact: Contact; interaction: ContactInteraction } {
  const sentAt = timestamp(input.sentAt) != null ? input.sentAt! : now.toISOString();
  const inMail = contact.channel === "linkedin_inmail";
  const next = updateOutreachContact(
    contact,
    {
      status: "SENT",
      subject: input.subject ?? contact.subject,
      messageContent: input.content ?? contact.messageContent,
      followUpAt: input.followUpAt ?? contact.followUpAt,
      inMailCreditConsumed: inMail ? true : contact.inMailCreditConsumed,
      inMailCredits: inMail
        ? input.inMailCredits && input.inMailCredits > 0
          ? input.inMailCredits
          : contact.inMailCredits && contact.inMailCredits > 0
            ? contact.inMailCredits
            : 1
        : contact.inMailCredits,
    },
    now,
  );
  next.sentAt = sentAt;
  next.lastContactAt = sentAt;
  return {
    contact: next,
    interaction: {
      id: input.interactionId ?? `interaction-${contact.id}-${sentAt}`,
      contactId: contact.id,
      applicationId: contact.applicationId,
      jobId: contact.jobId,
      type: "message",
      channel: contact.channel,
      subject: input.subject ?? contact.subject,
      occurredAt: sentAt,
      content: input.content ?? contact.messageContent,
    },
  };
}

export function recordOutreachReply(
  contact: Contact,
  input: { repliedAt?: string; content?: string; interactionId?: string } = {},
  now = new Date(),
): { contact: Contact; interaction: ContactInteraction } {
  const repliedAt = timestamp(input.repliedAt) != null ? input.repliedAt! : now.toISOString();
  const next = updateOutreachContact(contact, { status: "REPLIED", followUpAt: undefined }, now);
  next.repliedAt = repliedAt;
  next.lastContactAt = repliedAt;
  delete next.followUpAt;
  delete next.nextActionAt;
  return {
    contact: next,
    interaction: {
      id: input.interactionId ?? `interaction-${contact.id}-${repliedAt}`,
      contactId: contact.id,
      applicationId: contact.applicationId,
      jobId: contact.jobId,
      type: "reply",
      channel: contact.channel,
      occurredAt: repliedAt,
      content: input.content,
    },
  };
}

export function isOutreachFollowUpDue(contact: Contact, now = new Date()): boolean {
  if (contact.archivedAt || !hasBeenSent(contact) || hasReply(contact)) return false;
  if (normalizeOutreachStatus(contact.status) === "CLOSED") return false;
  const dueAt = timestamp(contact.followUpAt ?? contact.nextActionAt);
  return dueAt != null && dueAt <= now.getTime();
}

export function effectiveOutreachStatus(contact: Contact, now = new Date()): OutreachStatus {
  if (isOutreachFollowUpDue(contact, now)) return "FOLLOW_UP_DUE";
  return normalizeOutreachStatus(contact.status);
}

export function computeOutreachMetrics(contacts: readonly Contact[], now = new Date()): OutreachMetrics {
  const active = contacts.filter((contact) => !contact.archivedAt);
  const sent = active.filter(hasBeenSent).length;
  const replied = active.filter((contact) => hasBeenSent(contact) && hasReply(contact)).length;
  return {
    identified: active.filter((contact) => effectiveOutreachStatus(contact, now) === "IDENTIFIED").length,
    prepared: active.filter((contact) => effectiveOutreachStatus(contact, now) === "MESSAGE_PREPARED").length,
    sent,
    replied,
    followUpsPending: active.filter((contact) => isOutreachFollowUpDue(contact, now)).length,
    responseRate: sent === 0 ? 0 : replied / sent,
  };
}
