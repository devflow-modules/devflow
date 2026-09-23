import {
  CONTACT_STATUSES,
  CONTACT_TYPES,
  OUTREACH_CHANNELS,
  OUTREACH_LANGUAGES,
  validateOutreachProfileUrl,
  type Contact,
  type ContactInteraction,
} from "@devflow/applyflow-core";

export const APPLYFLOW_DASHBOARD_CONTACTS_STORAGE_KEY = "APPLYFLOW_DASHBOARD_CONTACTS_V1" as const;
export const DASHBOARD_CONTACTS_STORAGE_VERSION = 1 as const;

export type DashboardStoredContacts = {
  version: typeof DASHBOARD_CONTACTS_STORAGE_VERSION;
  savedAt: string;
  contacts: Contact[];
  interactions: ContactInteraction[];
};

export type DashboardContactsLoadResult = {
  contacts: Contact[];
  interactions: ContactInteraction[];
  status: "empty" | "ok" | "unreadable";
};

export type ApplicationOutreachScope = {
  applicationId: string;
  jobId: string;
};

export type DashboardOutreachWriteResult =
  | { ok: true }
  | { ok: false; error: "invalid_outreach" | "outreach_scope_mismatch" | "outreach_not_found" };

function emptyResult(): DashboardContactsLoadResult {
  return { contacts: [], interactions: [], status: "empty" };
}

export function loadDashboardContacts(): DashboardContactsLoadResult {
  if (typeof window === "undefined") return emptyResult();
  const raw = window.localStorage.getItem(APPLYFLOW_DASHBOARD_CONTACTS_STORAGE_KEY);
  if (!raw) return emptyResult();
  try {
    const data = JSON.parse(raw) as DashboardStoredContacts;
    if (data.version !== DASHBOARD_CONTACTS_STORAGE_VERSION) {
      return { contacts: [], interactions: [], status: "unreadable" };
    }
    return {
      contacts: Array.isArray(data.contacts) ? data.contacts : [],
      interactions: Array.isArray(data.interactions) ? data.interactions : [],
      status: "ok",
    };
  } catch {
    return { contacts: [], interactions: [], status: "unreadable" };
  }
}

export function persistDashboardContacts(contacts: Contact[], interactions: ContactInteraction[]): void {
  if (typeof window === "undefined") return;
  const doc: DashboardStoredContacts = {
    version: DASHBOARD_CONTACTS_STORAGE_VERSION,
    savedAt: new Date().toISOString(),
    contacts,
    interactions,
  };
  window.localStorage.setItem(APPLYFLOW_DASHBOARD_CONTACTS_STORAGE_KEY, JSON.stringify(doc));
}

export function loadApplicationOutreach(scope: ApplicationOutreachScope): DashboardContactsLoadResult {
  const stored = loadDashboardContacts();
  const contacts = stored.contacts.filter(
    (contact) =>
      !contact.archivedAt &&
      (contact.applicationId === scope.applicationId ||
        (!contact.applicationId && contact.jobId === scope.jobId)),
  );
  const contactIds = new Set(contacts.map((contact) => contact.id));
  const interactions = stored.interactions.filter(
    (interaction) =>
      contactIds.has(interaction.contactId) &&
      (!interaction.applicationId || interaction.applicationId === scope.applicationId),
  );
  return { contacts, interactions, status: stored.status };
}

function validContact(scope: ApplicationOutreachScope, contact: Contact): boolean {
  const parsed = (value: string | undefined) => {
    if (!value) return undefined;
    const timestamp = Date.parse(value);
    return Number.isFinite(timestamp) ? timestamp : Number.NaN;
  };
  const sentAt = parsed(contact.sentAt);
  const repliedAt = parsed(contact.repliedAt);
  const followUpAt = parsed(contact.followUpAt);
  if (
    contact.applicationId !== scope.applicationId ||
    contact.jobId !== scope.jobId ||
    !contact.name.trim() ||
    !CONTACT_TYPES.includes(contact.type) ||
    !CONTACT_STATUSES.includes(contact.status)
  ) {
    return false;
  }
  if (contact.channel && !OUTREACH_CHANNELS.includes(contact.channel)) return false;
  if (contact.language && !OUTREACH_LANGUAGES.includes(contact.language)) return false;
  if (contact.channel && !validateOutreachProfileUrl(contact.linkedinUrl, contact.channel)) return false;
  if (contact.email && !contact.email.includes("@")) return false;
  if ([sentAt, repliedAt, followUpAt].some((value) => Number.isNaN(value))) return false;
  if (sentAt != null && repliedAt != null && repliedAt < sentAt) return false;
  if (
    (contact.status === "IDENTIFIED" || contact.status === "MESSAGE_PREPARED") &&
    (sentAt != null || repliedAt != null)
  ) {
    return false;
  }
  if (
    (contact.status === "SENT" || contact.status === "FOLLOW_UP_DUE") &&
    (sentAt == null || repliedAt != null)
  ) {
    return false;
  }
  if (
    (contact.status === "REPLIED" || contact.status === "CONVERSATION") &&
    (sentAt == null || repliedAt == null)
  ) {
    return false;
  }
  if (
    contact.channel !== "linkedin_inmail" &&
    (contact.inMailCreditConsumed || (contact.inMailCredits ?? 0) > 0)
  ) {
    return false;
  }
  if (contact.inMailCredits != null && (!Number.isInteger(contact.inMailCredits) || contact.inMailCredits < 0)) {
    return false;
  }
  if (
    contact.channel === "linkedin_inmail" &&
    contact.inMailCreditConsumed &&
    (contact.inMailCredits == null || contact.inMailCredits < 1)
  ) {
    return false;
  }
  return true;
}

function normalizeOutreachForStorage(contact: Contact): Contact {
  if (
    contact.channel === "linkedin_inmail" &&
    contact.inMailCreditConsumed &&
    (contact.inMailCredits == null || contact.inMailCredits === 0)
  ) {
    return { ...contact, inMailCredits: 1 };
  }
  return contact;
}

export function saveDashboardOutreach(
  scope: ApplicationOutreachScope,
  contact: Contact,
  interaction?: ContactInteraction,
): DashboardOutreachWriteResult {
  const normalizedContact = normalizeOutreachForStorage(contact);
  if (!validContact(scope, normalizedContact)) return { ok: false, error: "invalid_outreach" };
  const stored = loadDashboardContacts();
  const current = stored.contacts.find((item) => item.id === normalizedContact.id);
  if (
    current &&
    ((current.applicationId && current.applicationId !== scope.applicationId) ||
      (current.jobId && current.jobId !== scope.jobId))
  ) {
    return { ok: false, error: "outreach_scope_mismatch" };
  }
  if (
    interaction &&
    (interaction.contactId !== normalizedContact.id ||
      (interaction.applicationId && interaction.applicationId !== scope.applicationId) ||
      (interaction.jobId && interaction.jobId !== scope.jobId))
  ) {
    return { ok: false, error: "outreach_scope_mismatch" };
  }
  if (interaction && !Number.isFinite(Date.parse(interaction.occurredAt))) {
    return { ok: false, error: "invalid_outreach" };
  }
  persistDashboardContacts(
    [...stored.contacts.filter((item) => item.id !== normalizedContact.id), normalizedContact],
    interaction
      ? [...stored.interactions.filter((item) => item.id !== interaction.id), interaction]
      : stored.interactions,
  );
  return { ok: true };
}

export function archiveDashboardOutreach(
  scope: ApplicationOutreachScope,
  contactId: string,
  now = new Date(),
): DashboardOutreachWriteResult {
  const stored = loadDashboardContacts();
  const contact = stored.contacts.find((item) => item.id === contactId);
  if (!contact) return { ok: false, error: "outreach_not_found" };
  if (
    (contact.applicationId && contact.applicationId !== scope.applicationId) ||
    (contact.jobId && contact.jobId !== scope.jobId)
  ) {
    return { ok: false, error: "outreach_scope_mismatch" };
  }
  return saveDashboardOutreach(scope, {
    ...contact,
    applicationId: scope.applicationId,
    jobId: scope.jobId,
    archivedAt: now.toISOString(),
    updatedAt: now.toISOString(),
  });
}

export function clearPersistedDashboardContacts(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(APPLYFLOW_DASHBOARD_CONTACTS_STORAGE_KEY);
}
