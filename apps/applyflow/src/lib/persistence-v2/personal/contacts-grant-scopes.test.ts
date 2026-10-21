import { describe, expect, it } from "vitest";
import type { Contact, ContactInteraction } from "@devflow/applyflow-core";

import {
  EXTENSION_GRANT_LEGACY_SCOPES,
  EXTENSION_GRANT_REQUESTABLE_SCOPES,
  grantHasScope,
} from "./extension-grant-scopes";
import { createExtensionGrantService, createMemoryExtensionGrantStore } from "./extension-grants";
import { createPersonalContactsService } from "./services";
import { createMemoryPersonalStore } from "./store";

const ACCOUNT_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ACCOUNT_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function contact(id: string): Contact {
  return {
    id,
    name: "Jordan Manager",
    type: "engineering_manager",
    status: "not_contacted",
    createdAt: "2026-10-20T12:00:00.000Z",
    updatedAt: "2026-10-20T12:00:00.000Z",
  };
}

describe("contacts + grant scopes (in-memory)", () => {
  it("isolates contacts across accounts and refuses contacts scope on legacy grants", async () => {
    const grants = createExtensionGrantService(createMemoryExtensionGrantStore());
    const legacy = await grants.mint(ACCOUNT_A, EXTENSION_GRANT_LEGACY_SCOPES);
    const withContacts = await grants.mint(ACCOUNT_B, EXTENSION_GRANT_REQUESTABLE_SCOPES);

    const resolvedLegacy = await grants.resolve(legacy.token);
    const resolvedContacts = await grants.resolve(withContacts.token);
    expect(grantHasScope(resolvedLegacy?.scopes, "contacts:write")).toBe(false);
    expect(grantHasScope(resolvedContacts?.scopes, "contacts:write")).toBe(true);

    const store = createMemoryPersonalStore();
    const contacts = createPersonalContactsService(store);
    await contacts.saveContact(ACCOUNT_A, contact("c-a"));
    await contacts.saveContact(ACCOUNT_B, contact("c-a"));

    const listedA = await contacts.list(ACCOUNT_A);
    const listedB = await contacts.list(ACCOUNT_B);
    expect(listedA.contacts).toHaveLength(1);
    expect(listedB.contacts).toHaveLength(1);
    expect(listedA.contacts[0]?.name).toBe("Jordan Manager");

    const interaction: ContactInteraction = {
      id: "i-a",
      contactId: "c-a",
      type: "note",
      occurredAt: "2026-10-20T12:10:00.000Z",
      content: "manual note",
    };
    await contacts.saveInteraction(ACCOUNT_A, interaction);
    await expect(contacts.saveInteraction(ACCOUNT_B, interaction)).resolves.toEqual(interaction);

    const listedA2 = await contacts.list(ACCOUNT_A);
    expect(listedA2.interactions).toHaveLength(1);
    const listedB2 = await contacts.list(ACCOUNT_B);
    expect(listedB2.interactions).toHaveLength(1);
  });

  it("same fingerprint is idempotent on retry; stale expectedVersion conflicts", async () => {
    const store = createMemoryPersonalStore();
    const contacts = createPersonalContactsService(store);
    const base = contact("c-concurrent");

    const first = await contacts.saveContact(ACCOUNT_A, base);
    const second = await contacts.saveContact(ACCOUNT_A, base);
    expect(first.version).toBe(1);
    expect(second.version).toBe(1);

    const updated = await contacts.saveContact(
      ACCOUNT_A,
      { ...base, name: "Changed" },
      first.version,
    );
    expect(updated.contact.name).toBe("Changed");

    await expect(
      contacts.saveContact(ACCOUNT_A, { ...base, name: "Stale" }, first.version),
    ).rejects.toMatchObject({ code: "version_conflict" });
  });
});
