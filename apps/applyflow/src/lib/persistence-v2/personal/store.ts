export type ProfileRow = {
  accountId: string;
  library: unknown;
  version: number;
  fingerprint: string;
};

export type ContactRow = {
  accountId: string;
  id: string;
  applicationId: string | null;
  jobId: string | null;
  payload: unknown;
  version: number;
  fingerprint: string;
};

export type InteractionRow = {
  accountId: string;
  id: string;
  contactId: string;
  applicationId: string | null;
  jobId: string | null;
  payload: unknown;
  fingerprint: string;
};

export type ResponseRow = {
  accountId: string;
  id: string;
  provider: string;
  emailId: string;
  applicationId: string | null;
  state: string;
  payload: unknown;
  version: number;
  fingerprint: string;
};

export type CareerEventRow = {
  accountId: string;
  id: string;
  applicationId: string;
  jobId: string | null;
  eventType: string;
  occurredAt: string;
  dedupeKey: string;
  payload: unknown;
};

export type PersonalImportModule = "profile" | "contacts" | "responses";

export type ImportSessionRow = {
  id: string;
  accountId: string;
  module: PersonalImportModule;
  bundleFingerprint: string;
  status: "in_progress" | "completed" | "conflict";
  expectedCount: number;
  processedCount: number;
  conflictSummary: unknown;
  completedAt: string | null;
};

export type PersonalStore = {
  getProfile(accountId: string): Promise<ProfileRow | null>;
  insertProfile(row: ProfileRow): Promise<ProfileRow>;
  updateProfile(
    accountId: string,
    expectedVersion: number,
    next: Pick<ProfileRow, "library" | "fingerprint">,
  ): Promise<{ ok: true; row: ProfileRow } | { ok: false; reason: "conflict" | "not_found" }>;

  listContacts(accountId: string): Promise<ContactRow[]>;
  getContact(accountId: string, id: string): Promise<ContactRow | null>;
  insertContact(row: ContactRow): Promise<ContactRow | "duplicate">;
  updateContact(
    accountId: string,
    id: string,
    expectedVersion: number,
    next: Pick<ContactRow, "applicationId" | "jobId" | "payload" | "fingerprint">,
  ): Promise<{ ok: true; row: ContactRow } | { ok: false; reason: "conflict" | "not_found" }>;

  listInteractions(accountId: string): Promise<InteractionRow[]>;
  getInteraction(accountId: string, id: string): Promise<InteractionRow | null>;
  insertInteraction(row: InteractionRow): Promise<InteractionRow | "duplicate">;

  listResponses(accountId: string): Promise<ResponseRow[]>;
  getResponse(accountId: string, id: string): Promise<ResponseRow | null>;
  getResponseByIdentity(accountId: string, provider: string, emailId: string): Promise<ResponseRow | null>;
  insertResponse(row: ResponseRow): Promise<ResponseRow | "duplicate">;
  updateResponse(
    accountId: string,
    id: string,
    expectedVersion: number,
    next: Pick<ResponseRow, "applicationId" | "state" | "payload" | "fingerprint">,
  ): Promise<{ ok: true; row: ResponseRow } | { ok: false; reason: "conflict" | "not_found" }>;

  listEvents(accountId: string): Promise<CareerEventRow[]>;
  insertEvent(row: CareerEventRow): Promise<CareerEventRow | "duplicate">;

  findImportSession(
    accountId: string,
    module: PersonalImportModule,
    bundleFingerprint: string,
  ): Promise<ImportSessionRow | null>;
  insertImportSession(row: ImportSessionRow): Promise<ImportSessionRow>;
  updateImportSession(
    id: string,
    accountId: string,
    patch: Partial<Pick<ImportSessionRow, "status" | "processedCount" | "conflictSummary" | "completedAt">>,
  ): Promise<ImportSessionRow | null>;

  hasApplication(accountId: string, id: string): Promise<boolean>;
  hasJob(accountId: string, id: string): Promise<boolean>;
};

export function createMemoryPersonalStore(): PersonalStore & {
  profiles: Map<string, ProfileRow>;
  contacts: Map<string, ContactRow>;
  interactions: Map<string, InteractionRow>;
  responses: Map<string, ResponseRow>;
  events: Map<string, CareerEventRow>;
  sessions: Map<string, ImportSessionRow>;
  applications: Set<string>;
  jobs: Set<string>;
} {
  const profiles = new Map<string, ProfileRow>();
  const contacts = new Map<string, ContactRow>();
  const interactions = new Map<string, InteractionRow>();
  const responses = new Map<string, ResponseRow>();
  const events = new Map<string, CareerEventRow>();
  const sessions = new Map<string, ImportSessionRow>();
  const applications = new Set<string>();
  const jobs = new Set<string>();

  const key = (accountId: string, id: string) => `${accountId}::${id}`;

  return {
    profiles,
    contacts,
    interactions,
    responses,
    events,
    sessions,
    applications,
    jobs,
    async getProfile(accountId) {
      return profiles.get(accountId) ?? null;
    },
    async insertProfile(row) {
      if (profiles.has(row.accountId)) throw new Error("duplicate_profile");
      profiles.set(row.accountId, row);
      return row;
    },
    async updateProfile(accountId, expectedVersion, next) {
      const current = profiles.get(accountId);
      if (!current) return { ok: false, reason: "not_found" };
      if (current.version !== expectedVersion) return { ok: false, reason: "conflict" };
      const row: ProfileRow = { ...current, ...next, version: current.version + 1 };
      profiles.set(accountId, row);
      return { ok: true, row };
    },
    async listContacts(accountId) {
      return [...contacts.values()].filter((row) => row.accountId === accountId);
    },
    async getContact(accountId, id) {
      return contacts.get(key(accountId, id)) ?? null;
    },
    async insertContact(row) {
      const id = key(row.accountId, row.id);
      if (contacts.has(id)) return "duplicate";
      contacts.set(id, row);
      return row;
    },
    async updateContact(accountId, id, expectedVersion, next) {
      const current = contacts.get(key(accountId, id));
      if (!current) return { ok: false, reason: "not_found" };
      if (current.version !== expectedVersion) return { ok: false, reason: "conflict" };
      const row: ContactRow = { ...current, ...next, version: current.version + 1 };
      contacts.set(key(accountId, id), row);
      return { ok: true, row };
    },
    async listInteractions(accountId) {
      return [...interactions.values()].filter((row) => row.accountId === accountId);
    },
    async getInteraction(accountId, id) {
      return interactions.get(key(accountId, id)) ?? null;
    },
    async insertInteraction(row) {
      const id = key(row.accountId, row.id);
      if (interactions.has(id)) return "duplicate";
      interactions.set(id, row);
      return row;
    },
    async listResponses(accountId) {
      return [...responses.values()].filter((row) => row.accountId === accountId);
    },
    async getResponse(accountId, id) {
      return responses.get(key(accountId, id)) ?? null;
    },
    async getResponseByIdentity(accountId, provider, emailId) {
      return (
        [...responses.values()].find(
          (row) => row.accountId === accountId && row.provider === provider && row.emailId === emailId,
        ) ?? null
      );
    },
    async insertResponse(row) {
      if (
        [...responses.values()].some(
          (item) => item.accountId === row.accountId && item.provider === row.provider && item.emailId === row.emailId,
        )
      ) {
        return "duplicate";
      }
      if (responses.has(key(row.accountId, row.id))) return "duplicate";
      responses.set(key(row.accountId, row.id), row);
      return row;
    },
    async updateResponse(accountId, id, expectedVersion, next) {
      const current = responses.get(key(accountId, id));
      if (!current) return { ok: false, reason: "not_found" };
      if (current.version !== expectedVersion) return { ok: false, reason: "conflict" };
      const row: ResponseRow = { ...current, ...next, version: current.version + 1 };
      responses.set(key(accountId, id), row);
      return { ok: true, row };
    },
    async listEvents(accountId) {
      return [...events.values()]
        .filter((row) => row.accountId === accountId)
        .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
    },
    async insertEvent(row) {
      if ([...events.values()].some((item) => item.accountId === row.accountId && item.dedupeKey === row.dedupeKey)) {
        return "duplicate";
      }
      events.set(key(row.accountId, row.id), row);
      return row;
    },
    async findImportSession(accountId, module, bundleFingerprint) {
      return (
        [...sessions.values()].find(
          (row) =>
            row.accountId === accountId && row.module === module && row.bundleFingerprint === bundleFingerprint,
        ) ?? null
      );
    },
    async insertImportSession(row) {
      sessions.set(row.id, row);
      return row;
    },
    async updateImportSession(id, accountId, patch) {
      const current = sessions.get(id);
      if (!current || current.accountId !== accountId) return null;
      const next = { ...current, ...patch };
      sessions.set(id, next);
      return next;
    },
    async hasApplication(accountId, id) {
      return applications.has(key(accountId, id));
    },
    async hasJob(accountId, id) {
      return jobs.has(key(accountId, id));
    },
  };
}
