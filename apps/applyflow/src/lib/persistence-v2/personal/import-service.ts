import { createHash, randomUUID } from "node:crypto";

import type { Contact, ContactInteraction, ResponseDetection, ResumeLibrary } from "@devflow/applyflow-core";

import { fingerprintJson } from "./fingerprint";
import { PersonalServiceError, createPersonalContactsService, createPersonalProfileService, createPersonalResponsesService, responseProvider } from "./services";
import type { PersonalImportModule, PersonalStore } from "./store";

export type PersonalImportBundle = {
  confirmImport: boolean;
  profile?: ResumeLibrary;
  contacts?: Contact[];
  interactions?: ContactInteraction[];
  responses?: ResponseDetection[];
};

export type PersonalImportResult = {
  module: PersonalImportModule;
  status: "completed" | "conflict" | "in_progress";
  processedCount: number;
  expectedCount: number;
  conflicts: string[];
  resumed: boolean;
};

function moduleFingerprint(module: PersonalImportModule, bundle: PersonalImportBundle): string {
  if (module === "profile") return fingerprintJson(bundle.profile ?? null);
  if (module === "contacts") {
    return fingerprintJson({ contacts: bundle.contacts ?? [], interactions: bundle.interactions ?? [] });
  }
  return fingerprintJson(bundle.responses ?? []);
}

export function createPersonalImportService(store: PersonalStore) {
  const profiles = createPersonalProfileService(store);
  const contacts = createPersonalContactsService(store);
  const responses = createPersonalResponsesService(store);

  async function sessionFor(accountId: string, module: PersonalImportModule, fingerprint: string, expectedCount: number) {
    const existing = await store.findImportSession(accountId, module, fingerprint);
    if (existing) return { session: existing, resumed: true };
    const session = await store.insertImportSession({
      id: randomUUID(),
      accountId,
      module,
      bundleFingerprint: fingerprint,
      status: "in_progress",
      expectedCount,
      processedCount: 0,
      conflictSummary: null,
      completedAt: null,
    });
    return { session, resumed: false };
  }

  return {
    async importModule(
      accountId: string,
      module: PersonalImportModule,
      bundle: PersonalImportBundle,
    ): Promise<PersonalImportResult> {
      if (bundle.confirmImport !== true) {
        throw new PersonalServiceError("import_not_confirmed");
      }
      const fingerprint = moduleFingerprint(module, bundle);
      if (module === "profile") {
        const { session, resumed } = await sessionFor(accountId, module, fingerprint, bundle.profile ? 1 : 0);
        if (session.status === "completed") {
          return {
            module,
            status: "completed",
            processedCount: session.processedCount,
            expectedCount: session.expectedCount,
            conflicts: [],
            resumed: true,
          };
        }
        if (!bundle.profile) {
          const done = await store.updateImportSession(session.id, accountId, {
            status: "completed",
            processedCount: 0,
            completedAt: new Date().toISOString(),
          });
          return {
            module,
            status: "completed",
            processedCount: done?.processedCount ?? 0,
            expectedCount: 0,
            conflicts: [],
            resumed,
          };
        }
        try {
          const current = await store.getProfile(accountId);
          if (current && current.fingerprint !== fingerprintJson(bundle.profile)) {
            await store.updateImportSession(session.id, accountId, {
              status: "conflict",
              conflictSummary: { ids: ["profile"] },
            });
            return {
              module,
              status: "conflict",
              processedCount: session.processedCount,
              expectedCount: 1,
              conflicts: ["profile"],
              resumed,
            };
          }
          await profiles.save(accountId, bundle.profile, current?.version);
          const done = await store.updateImportSession(session.id, accountId, {
            status: "completed",
            processedCount: 1,
            completedAt: new Date().toISOString(),
            conflictSummary: null,
          });
          return {
            module,
            status: "completed",
            processedCount: done?.processedCount ?? 1,
            expectedCount: 1,
            conflicts: [],
            resumed,
          };
        } catch (error) {
          if (error instanceof PersonalServiceError && error.code === "version_conflict") {
            await store.updateImportSession(session.id, accountId, {
              status: "conflict",
              conflictSummary: { ids: ["profile"] },
            });
            return {
              module,
              status: "conflict",
              processedCount: 0,
              expectedCount: 1,
              conflicts: ["profile"],
              resumed,
            };
          }
          throw error;
        }
      }

      if (module === "contacts") {
        const items = bundle.contacts ?? [];
        const { session, resumed } = await sessionFor(accountId, module, fingerprint, items.length);
        if (session.status === "completed") {
          return {
            module,
            status: "completed",
            processedCount: session.processedCount,
            expectedCount: session.expectedCount,
            conflicts: [],
            resumed: true,
          };
        }
        const conflicts: string[] = [];
        let processed = 0;
        for (const contact of items) {
          const existing = await store.getContact(accountId, contact.id);
          const nextFingerprint = fingerprintJson(contact);
          if (existing && existing.fingerprint !== nextFingerprint) {
            conflicts.push(contact.id);
            continue;
          }
          await contacts.saveContact(accountId, contact, existing?.version);
          processed += 1;
        }
        for (const interaction of bundle.interactions ?? []) {
          const existing = await store.getInteraction(accountId, interaction.id);
          if (existing && existing.fingerprint !== fingerprintJson(interaction)) {
            conflicts.push(interaction.id);
            continue;
          }
          if (!existing) {
            await contacts.saveInteraction(accountId, interaction);
          }
        }
        const status = conflicts.length > 0 ? "conflict" : "completed";
        await store.updateImportSession(session.id, accountId, {
          status,
          processedCount: processed,
          conflictSummary: conflicts.length > 0 ? { ids: conflicts } : null,
          completedAt: status === "completed" ? new Date().toISOString() : null,
        });
        return { module, status, processedCount: processed, expectedCount: items.length, conflicts, resumed };
      }

      const items = bundle.responses ?? [];
      const { session, resumed } = await sessionFor(accountId, module, fingerprint, items.length);
      if (session.status === "completed") {
        return {
          module,
          status: "completed",
          processedCount: session.processedCount,
          expectedCount: session.expectedCount,
          conflicts: [],
          resumed: true,
        };
      }
      const conflicts: string[] = [];
      let processed = 0;
      for (const detection of items) {
        const existing = await store.getResponseByIdentity(
          accountId,
          responseProvider(detection, detection),
          detection.emailId,
        );
        const nextFingerprint = fingerprintJson(detection);
        if (existing && existing.fingerprint !== nextFingerprint) {
          conflicts.push(detection.id);
          continue;
        }
        await responses.save(accountId, detection, existing?.version);
        processed += 1;
      }
      const status = conflicts.length > 0 ? "conflict" : "completed";
      await store.updateImportSession(session.id, accountId, {
        status,
        processedCount: processed,
        conflictSummary: conflicts.length > 0 ? { ids: conflicts } : null,
        completedAt: status === "completed" ? new Date().toISOString() : null,
      });
      return { module, status, processedCount: processed, expectedCount: items.length, conflicts, resumed };
    },
  };
}

export function hashExtensionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
