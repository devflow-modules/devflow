import {
  CONTACT_INTERACTION_TYPES,
  CONTACT_STATUSES,
  CONTACT_TYPES,
  parseResumeLibrary,
  type Contact,
  type ContactInteraction,
  type ResponseDetection,
  type ResumeLibrary,
} from "@devflow/applyflow-core";

import { isValidDashboardContact } from "@/lib/local-contact-storage";
import { parseResponseDetection } from "@/lib/local-inbound-response-storage";

import { fingerprintJson } from "./fingerprint";
import type { PersonalStore, ResponseRow } from "./store";

export type PersonalServiceErrorCode =
  | "invalid_payload"
  | "not_found"
  | "version_conflict"
  | "duplicate"
  | "import_not_confirmed"
  | "import_conflict";

export class PersonalServiceError extends Error {
  readonly code: PersonalServiceErrorCode;

  constructor(code: PersonalServiceErrorCode) {
    super(code);
    this.name = "PersonalServiceError";
    this.code = code;
  }
}

async function assertOwnedRefs(
  store: PersonalStore,
  accountId: string,
  refs: { applicationId?: string | null; jobId?: string | null; contactId?: string | null },
): Promise<void> {
  if (refs.applicationId) {
    const owned = await store.hasApplication(accountId, refs.applicationId);
    if (!owned) throw new PersonalServiceError("not_found");
  }
  if (refs.jobId) {
    const owned = await store.hasJob(accountId, refs.jobId);
    if (!owned) throw new PersonalServiceError("not_found");
  }
  if (refs.contactId) {
    const owned = await store.getContact(accountId, refs.contactId);
    if (!owned) throw new PersonalServiceError("not_found");
  }
}

export function createPersonalProfileService(store: PersonalStore) {
  return {
    async read(accountId: string): Promise<{ library: ResumeLibrary; version: number } | null> {
      const row = await store.getProfile(accountId);
      if (!row) return null;
      const parsed = parseResumeLibrary(row.library);
      if (!parsed.ok) return null;
      return { library: parsed.library, version: row.version };
    },

    async save(
      accountId: string,
      library: unknown,
      expectedVersion?: number,
    ): Promise<{ library: ResumeLibrary; version: number }> {
      const parsed = parseResumeLibrary(library);
      if (!parsed.ok) throw new PersonalServiceError("invalid_payload");
      const fingerprint = fingerprintJson(parsed.library);
      const current = await store.getProfile(accountId);
      if (!current) {
        if (expectedVersion != null && expectedVersion !== 0) {
          throw new PersonalServiceError("version_conflict");
        }
        const row = await store.insertProfile({
          accountId,
          library: parsed.library,
          version: 1,
          fingerprint,
        });
        return { library: parsed.library, version: row.version };
      }
      if (current.fingerprint === fingerprint) {
        return { library: parsed.library, version: current.version };
      }
      if (expectedVersion == null || expectedVersion !== current.version) {
        throw new PersonalServiceError("version_conflict");
      }
      const updated = await store.updateProfile(accountId, expectedVersion, {
        library: parsed.library,
        fingerprint,
      });
      if (!updated.ok) {
        throw new PersonalServiceError(updated.reason === "conflict" ? "version_conflict" : "not_found");
      }
      return { library: parsed.library, version: updated.row.version };
    },
  };
}

function asContact(payload: unknown): Contact | null {
  if (!payload || typeof payload !== "object") return null;
  const contact = payload as Contact;
  if (!contact.id || !contact.name || !CONTACT_TYPES.includes(contact.type) || !CONTACT_STATUSES.includes(contact.status)) {
    return null;
  }
  return contact;
}

export function createPersonalContactsService(store: PersonalStore) {
  return {
    async list(accountId: string): Promise<{
      contacts: Contact[];
      interactions: ContactInteraction[];
      versions: Record<string, number>;
    }> {
      const rows = await store.listContacts(accountId);
      const contacts = rows
        .map((row) => asContact(row.payload))
        .filter((item): item is Contact => item != null);
      const versions: Record<string, number> = {};
      for (const row of rows) versions[row.id] = row.version;
      const interactions = (await store.listInteractions(accountId))
        .map((row) => row.payload as ContactInteraction)
        .filter((item) => item && typeof item.id === "string");
      return { contacts, interactions, versions };
    },

    async saveContact(
      accountId: string,
      contact: Contact,
      expectedVersion?: number,
    ): Promise<{ contact: Contact; version: number }> {
      const applicationId = contact.applicationId ?? null;
      const jobId = contact.jobId ?? null;
      // applicationId requires jobId; jobId-only is allowed (networking before Application).
      if (applicationId && !jobId) {
        throw new PersonalServiceError("invalid_payload");
      }
      if (applicationId && jobId) {
        if (!isValidDashboardContact({ applicationId, jobId }, contact)) {
          throw new PersonalServiceError("invalid_payload");
        }
      } else if (
        !contact.name.trim() ||
        !CONTACT_TYPES.includes(contact.type) ||
        !CONTACT_STATUSES.includes(contact.status)
      ) {
        throw new PersonalServiceError("invalid_payload");
      }
      await assertOwnedRefs(store, accountId, { applicationId, jobId });
      const fingerprint = fingerprintJson(contact);
      const current = await store.getContact(accountId, contact.id);
      if (!current) {
        const inserted = await store.insertContact({
          accountId,
          id: contact.id,
          applicationId,
          jobId,
          payload: contact,
          version: 1,
          fingerprint,
        });
        if (inserted === "duplicate") throw new PersonalServiceError("duplicate");
        return { contact, version: inserted.version };
      }
      if (
        current.applicationId &&
        applicationId &&
        current.applicationId !== applicationId
      ) {
        throw new PersonalServiceError("invalid_payload");
      }
      if (current.fingerprint === fingerprint) {
        return { contact, version: current.version };
      }
      if (expectedVersion == null || expectedVersion !== current.version) {
        throw new PersonalServiceError("version_conflict");
      }
      const updated = await store.updateContact(accountId, contact.id, expectedVersion, {
        applicationId,
        jobId,
        payload: contact,
        fingerprint,
      });
      if (!updated.ok) {
        throw new PersonalServiceError(updated.reason === "conflict" ? "version_conflict" : "not_found");
      }
      return { contact, version: updated.row.version };
    },

    async saveInteraction(accountId: string, interaction: ContactInteraction): Promise<ContactInteraction> {
      if (!CONTACT_INTERACTION_TYPES.includes(interaction.type) || !interaction.contactId || !interaction.id) {
        throw new PersonalServiceError("invalid_payload");
      }
      await assertOwnedRefs(store, accountId, {
        contactId: interaction.contactId,
        applicationId: interaction.applicationId ?? null,
        jobId: interaction.jobId ?? null,
      });
      const contact = await store.getContact(accountId, interaction.contactId);
      if (!contact) throw new PersonalServiceError("not_found");
      if (
        interaction.applicationId &&
        contact.applicationId &&
        interaction.applicationId !== contact.applicationId
      ) {
        throw new PersonalServiceError("invalid_payload");
      }
      const existing = await store.getInteraction(accountId, interaction.id);
      const fingerprint = fingerprintJson(interaction);
      if (existing) {
        if (existing.fingerprint === fingerprint) return interaction;
        throw new PersonalServiceError("version_conflict");
      }
      const inserted = await store.insertInteraction({
        accountId,
        id: interaction.id,
        contactId: interaction.contactId,
        applicationId: interaction.applicationId ?? null,
        jobId: interaction.jobId ?? null,
        payload: interaction,
        fingerprint,
      });
      if (inserted === "duplicate") throw new PersonalServiceError("duplicate");
      return interaction;
    },
  };
}

const RESPONSE_PROVIDERS = new Set(["gmail", "manual"]);

export function responseProvider(raw: unknown, detection: ResponseDetection): string {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new PersonalServiceError("invalid_payload");
  }
  const provider = (raw as { provider?: unknown }).provider;
  if (typeof provider !== "string" || !RESPONSE_PROVIDERS.has(provider)) {
    throw new PersonalServiceError("invalid_payload");
  }
  if (detection.emailId === detection.senderDomain || detection.emailId.includes("@")) {
    throw new PersonalServiceError("invalid_payload");
  }
  return provider;
}

function responsePayload(row: ResponseRow): ResponseDetection | null {
  return parseResponseDetection(row.payload);
}

export function createPersonalResponsesService(store: PersonalStore) {
  return {
    async list(accountId: string): Promise<Array<{ detection: ResponseDetection; version: number }>> {
      const rows = await store.listResponses(accountId);
      return rows
        .map((row) => {
          const detection = responsePayload(row);
          return detection ? { detection, version: row.version } : null;
        })
        .filter((item): item is { detection: ResponseDetection; version: number } => item != null);
    },

    async save(
      accountId: string,
      raw: unknown,
      expectedVersion?: number,
    ): Promise<{ detection: ResponseDetection; version: number }> {
      const detection = parseResponseDetection(raw);
      if (!detection || detection.autoApply !== false || detection.reviewRequired !== true) {
        throw new PersonalServiceError("invalid_payload");
      }
      const provider = responseProvider(raw, detection);
      if (detection.applicationId) {
        await assertOwnedRefs(store, accountId, { applicationId: detection.applicationId });
      }
      const fingerprint = fingerprintJson(detection);
      const current = await store.getResponseByIdentity(accountId, provider, detection.emailId);
      if (current && current.id !== detection.id) {
        throw new PersonalServiceError("duplicate");
      }
      const stored = { ...detection, provider };
      if (!current) {
        const inserted = await store.insertResponse({
          accountId,
          id: detection.id,
          provider,
          emailId: detection.emailId,
          applicationId: detection.applicationId ?? null,
          state: detection.state,
          payload: stored,
          version: 1,
          fingerprint,
        });
        if (inserted === "duplicate") throw new PersonalServiceError("duplicate");
        return { detection: stored, version: inserted.version };
      }
      if (current.fingerprint === fingerprint) {
        return { detection: stored, version: current.version };
      }
      if (expectedVersion == null || expectedVersion !== current.version) {
        throw new PersonalServiceError("version_conflict");
      }
      const updated = await store.updateResponse(accountId, current.id, expectedVersion, {
        applicationId: detection.applicationId ?? null,
        state: detection.state,
        payload: stored,
        fingerprint,
      });
      if (!updated.ok) {
        throw new PersonalServiceError(updated.reason === "conflict" ? "version_conflict" : "not_found");
      }
      return { detection, version: updated.row.version };
    },
  };
}

export function createPersonalAnalyticsService(store: PersonalStore) {
  return {
    async read(accountId: string) {
      const [events, contacts, interactions, responses] = await Promise.all([
        store.listEvents(accountId),
        store.listContacts(accountId),
        store.listInteractions(accountId),
        store.listResponses(accountId),
      ]);
      return {
        events: events.map((row) => row.payload),
        contactCount: contacts.length,
        interactionCount: interactions.length,
        responses: {
          pending: responses.filter((row) => row.state === "pending_review").length,
          confirmed: responses.filter((row) => row.state === "confirmed").length,
          dismissed: responses.filter((row) => row.state === "dismissed").length,
        },
      };
    },
  };
}
