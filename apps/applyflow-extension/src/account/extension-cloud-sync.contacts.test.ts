import { describe, expect, it, vi } from "vitest";
import type { Contact, ContactInteraction } from "@devflow/applyflow-core";

import { listCloudContacts, saveCloudContact, saveCloudInteraction } from "./extension-cloud-sync.js";

const CONTACT: Contact = {
  id: "extcontact_a",
  name: "Ada Recruiter",
  type: "recruiter",
  status: "not_contacted",
  createdAt: "2026-10-20T12:00:00.000Z",
  updatedAt: "2026-10-20T12:00:00.000Z",
};

describe("extension cloud contacts sync", () => {
  it("reconciles identical payload after a lost response (network after commit)", async () => {
    const fetchImpl = vi.fn().mockImplementation(async (_url: string, init?: RequestInit) => {
      if ((init?.method ?? "GET") === "PUT") {
        throw new TypeError("network");
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          contacts: [CONTACT],
          interactions: [],
          versions: { [CONTACT.id]: 1 },
        }),
      };
    });

    const lost = await saveCloudContact({
      origin: "http://127.0.0.1:3010",
      token: "t".repeat(64),
      contact: CONTACT,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(lost.ok).toBe(true);
    if (lost.ok) {
      expect(lost.reused).toBe(true);
      expect(lost.version).toBe(1);
    }
  });

  it("does not reconcile abort into success even if server already has the contact", async () => {
    const controller = new AbortController();
    controller.abort();
    const fetchImpl = vi.fn().mockImplementation(async (_url: string, init?: RequestInit) => {
      if (init?.signal?.aborted) {
        const error = new Error("aborted");
        error.name = "AbortError";
        throw error;
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          contacts: [CONTACT],
          interactions: [],
          versions: { [CONTACT.id]: 1 },
        }),
      };
    });

    const result = await saveCloudContact({
      origin: "http://127.0.0.1:3010",
      token: "t".repeat(64),
      contact: CONTACT,
      signal: controller.signal,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("aborted");
      expect(result.status).toBe(0);
    }
  });

  it("returns version_conflict when listed contact differs after network loss", async () => {
    const diverged = { ...CONTACT, name: "Other Name" };
    const fetchImpl = vi.fn().mockImplementation(async (_url: string, init?: RequestInit) => {
      if ((init?.method ?? "GET") === "PUT") {
        throw new TypeError("network");
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          contacts: [diverged],
          interactions: [],
          versions: { [CONTACT.id]: 2 },
        }),
      };
    });

    const result = await saveCloudContact({
      origin: "http://127.0.0.1:3010",
      token: "t".repeat(64),
      contact: CONTACT,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("version_conflict");
      expect(result.status).toBe(409);
    }
  });

  it("lists contacts and registers an interaction", async () => {
    const interaction: ContactInteraction = {
      id: "extinteraction_a",
      contactId: CONTACT.id,
      type: "note",
      occurredAt: "2026-10-20T12:05:00.000Z",
      content: "manual",
    };
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          contacts: [CONTACT],
          interactions: [],
          versions: { [CONTACT.id]: 1 },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ interaction }),
      });

    const listed = await listCloudContacts({
      origin: "http://127.0.0.1:3010",
      token: "t".repeat(64),
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(listed.ok).toBe(true);

    const saved = await saveCloudInteraction({
      origin: "http://127.0.0.1:3010",
      token: "t".repeat(64),
      interaction,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(saved.ok).toBe(true);
  });
});
