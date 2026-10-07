import { afterEach, describe, expect, it } from "vitest";
import { createResumeLibraryFromProfile, gustavoProfile, type Contact, type ResponseDetection } from "@devflow/applyflow-core";

import { createPersonalImportService } from "./import-service";
import { PersonalServiceError, createPersonalAnalyticsService, createPersonalContactsService, createPersonalProfileService, createPersonalResponsesService } from "./services";
import { createMemoryPersonalStore } from "./store";

const ACCOUNT_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ACCOUNT_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function library() {
  return createResumeLibraryFromProfile(gustavoProfile, {
    now: new Date("2026-10-05T12:00:00.000Z"),
    source: "manual",
  });
}

function contact(overrides: Partial<Contact> = {}): Contact {
  return {
    id: "c1",
    name: "Jordan Manager",
    type: "engineering_manager",
    status: "not_contacted",
    createdAt: "2026-09-09T12:00:00.000Z",
    updatedAt: "2026-09-09T12:00:00.000Z",
    ...overrides,
  };
}

function detection(overrides: Partial<ResponseDetection> & { provider?: "gmail" | "manual" } = {}) {
  return {
    id: "detect-1",
    emailId: "11111111111111111111111111111111",
    provider: "gmail" as const,
    headline: "Empresa enviou uma mensagem",
    matchStatus: "unmatched" as const,
    matchConfidence: "low" as const,
    matchEvidence: [],
    classification: "unknown" as const,
    classificationConfidence: "high" as const,
    classificationEvidence: [],
    suggestedStatus: null,
    pipelineChange: false,
    state: "pending_review" as const,
    detectedAt: "2026-09-15T18:00:00.000Z",
    receivedAt: "2026-09-15T18:00:00.000Z",
    senderDomain: "jobs.example",
    autoApply: false as const,
    reviewRequired: true as const,
    ...overrides,
  };
}

describe("account personal persistence", () => {
  afterEach(() => {
    // memory stores are local to each test
  });

  it("account A cannot read or update account B profile, contacts, or responses", async () => {
    const store = createMemoryPersonalStore();
    const profiles = createPersonalProfileService(store);
    const contacts = createPersonalContactsService(store);
    const responses = createPersonalResponsesService(store);

    await profiles.save(ACCOUNT_A, library());
    await contacts.saveContact(ACCOUNT_A, contact());
    await responses.save(ACCOUNT_A, detection());

    expect(await profiles.read(ACCOUNT_B)).toBeNull();
    expect((await contacts.list(ACCOUNT_B)).contacts).toEqual([]);
    expect(await responses.list(ACCOUNT_B)).toEqual([]);

    await expect(profiles.save(ACCOUNT_B, library(), 1)).rejects.toMatchObject({ code: "version_conflict" });
    expect((await profiles.read(ACCOUNT_A))?.version).toBe(1);
  });

  it("rejects a contact linked to another account's application and job", async () => {
    const store = createMemoryPersonalStore();
    store.applications.add(`${ACCOUNT_B}::app-b`);
    store.jobs.add(`${ACCOUNT_B}::job-b`);
    const contacts = createPersonalContactsService(store);

    await expect(
      contacts.saveContact(
        ACCOUNT_A,
        contact({ applicationId: "app-b", jobId: "job-b" }),
      ),
    ).rejects.toBeInstanceOf(PersonalServiceError);
  });

  it("accepts a contact only when the application and job belong to the same account", async () => {
    const store = createMemoryPersonalStore();
    store.applications.add(`${ACCOUNT_A}::app-a`);
    store.jobs.add(`${ACCOUNT_A}::job-a`);
    const contacts = createPersonalContactsService(store);
    const saved = await contacts.saveContact(
      ACCOUNT_A,
      contact({ applicationId: "app-a", jobId: "job-a" }),
    );
    expect(saved.version).toBe(1);
    await expect(
      contacts.saveInteraction(ACCOUNT_A, {
        id: "i1",
        contactId: "c1",
        applicationId: "app-a",
        jobId: "job-a",
        type: "note",
        occurredAt: "2026-10-05T12:00:00.000Z",
      }),
    ).resolves.toMatchObject({ id: "i1" });
  });

  it("accepts job-scoped contacts without applicationId (networking before Application)", async () => {
    const store = createMemoryPersonalStore();
    store.jobs.add(`${ACCOUNT_A}::job-pipeline`);
    const contacts = createPersonalContactsService(store);
    const saved = await contacts.saveContact(
      ACCOUNT_A,
      contact({
        id: "c-pipeline",
        jobId: "job-pipeline",
        status: "MESSAGE_PREPARED",
        messageContent: "Synthetic outreach",
        language: "EN",
        channel: "linkedin",
      }),
    );
    expect(saved.version).toBe(1);
    expect(saved.contact.jobId).toBe("job-pipeline");
    expect(saved.contact.applicationId).toBeUndefined();
  });

  it("rejects applicationId without jobId", async () => {
    const store = createMemoryPersonalStore();
    store.applications.add(`${ACCOUNT_A}::app-a`);
    const contacts = createPersonalContactsService(store);
    await expect(
      contacts.saveContact(ACCOUNT_A, contact({ applicationId: "app-a" })),
    ).rejects.toMatchObject({ code: "invalid_payload" });
  });

  it("does not overwrite a profile when the version conflicts", async () => {
    const store = createMemoryPersonalStore();
    const profiles = createPersonalProfileService(store);
    const first = await profiles.save(ACCOUNT_A, library());
    const changed = {
      ...library(),
      variants: library().variants.map((variant) => ({ ...variant, name: "Outra versão" })),
    };
    await expect(profiles.save(ACCOUNT_A, changed, first.version - 1)).rejects.toMatchObject({
      code: "version_conflict",
    });
    expect((await profiles.read(ACCOUNT_A))?.library.variants[0]?.name).toBe(first.library.variants[0]?.name);
  });

  it("dedupes by provider message id and keeps a different message from the same sender", async () => {
    const store = createMemoryPersonalStore();
    const responses = createPersonalResponsesService(store);
    const first = detection();
    await responses.save(ACCOUNT_A, first);
    await responses.save(
      ACCOUNT_A,
      detection({ id: "detect-2", emailId: "22222222222222222222222222222222" }),
    );
    await responses.save(
      ACCOUNT_A,
      detection({ id: "detect-3", emailId: first.emailId, provider: "manual" }),
    );
    expect(await responses.list(ACCOUNT_A)).toHaveLength(3);
    await expect(responses.save(ACCOUNT_A, { ...first, id: "other-id" })).rejects.toMatchObject({
      code: "duplicate",
    });
    await expect(
      responses.save(ACCOUNT_A, detection({ emailId: "jobs.example" })),
    ).rejects.toMatchObject({ code: "invalid_payload" });
    await expect(
      responses.save(ACCOUNT_A, detection({ emailId: "recruiter@jobs.example" })),
    ).rejects.toMatchObject({ code: "invalid_payload" });
  });

  it("dedupes a repeated import of the same provider message", async () => {
    const store = createMemoryPersonalStore();
    const responses = createPersonalResponsesService(store);
    const importer = createPersonalImportService(store);
    const item = detection();
    await responses.save(ACCOUNT_A, item);
    await expect(responses.save(ACCOUNT_A, { ...item, id: "other-id" })).rejects.toMatchObject({
      code: "duplicate",
    });

    const first = await importer.importModule(ACCOUNT_A, "responses", {
      confirmImport: true,
      responses: [item],
    });
    expect(first.status).toBe("completed");
    const second = await importer.importModule(ACCOUNT_A, "responses", {
      confirmImport: true,
      responses: [item],
    });
    expect(second.resumed).toBe(true);
    expect(second.status).toBe("completed");
    expect(await responses.list(ACCOUNT_A)).toHaveLength(1);
  });

  it("retries an import interrupted before the session is completed", async () => {
    const store = createMemoryPersonalStore();
    const original = store.insertContact.bind(store);
    let inserts = 0;
    store.insertContact = async (row) => {
      inserts += 1;
      if (inserts === 2) throw new Error("interrupted");
      return original(row);
    };
    const importer = createPersonalImportService(store);
    const bundle = {
      confirmImport: true as const,
      contacts: [contact({ id: "c1" }), contact({ id: "c2", name: "Alex" })],
    };
    await expect(importer.importModule(ACCOUNT_A, "contacts", bundle)).rejects.toThrow("interrupted");
    store.insertContact = original;
    const again = await importer.importModule(ACCOUNT_A, "contacts", bundle);
    expect(again.resumed).toBe(true);
    expect(again.status).toBe("completed");
    expect((await createPersonalContactsService(store).list(ACCOUNT_A)).contacts).toHaveLength(2);
  });

  it("reports a fingerprint conflict instead of last-write-wins", async () => {
    const store = createMemoryPersonalStore();
    const profiles = createPersonalProfileService(store);
    const importer = createPersonalImportService(store);
    await profiles.save(ACCOUNT_A, library());
    const other = {
      ...library(),
      variants: library().variants.map((variant) => ({ ...variant, name: "Conflito" })),
    };
    const result = await importer.importModule(ACCOUNT_A, "profile", {
      confirmImport: true,
      profile: other,
    });
    expect(result.status).toBe("conflict");
    expect((await profiles.read(ACCOUNT_A))?.library.variants[0]?.name).not.toBe("Conflito");
  });

  it("refuses an import that is not explicitly confirmed", async () => {
    const store = createMemoryPersonalStore();
    await expect(
      createPersonalImportService(store).importModule(ACCOUNT_A, "profile", {
        confirmImport: false,
        profile: library(),
      }),
    ).rejects.toMatchObject({ code: "import_not_confirmed" });
  });

  it("derives analytics from stored events and does not invent rows", async () => {
    const store = createMemoryPersonalStore();
    await store.insertEvent({
      accountId: ACCOUNT_A,
      id: "evt-1",
      applicationId: "app-a",
      jobId: "job-a",
      eventType: "applied",
      occurredAt: "2026-10-05T12:00:00.000Z",
      dedupeKey: "lifecycle:app-a:1",
      payload: { id: "evt-1", applicationId: "app-a", type: "applied", occurredAt: "2026-10-05T12:00:00.000Z" },
    });
    const analytics = await createPersonalAnalyticsService(store).read(ACCOUNT_A);
    expect(analytics.events).toHaveLength(1);
    expect(await createPersonalAnalyticsService(store).read(ACCOUNT_B)).toMatchObject({
      events: [],
      contactCount: 0,
    });
  });
});
