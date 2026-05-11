import { beforeEach, describe, expect, it } from "vitest";

import { chromeStorageBag } from "../test/chrome-storage-mock.js";
import { STORAGE_AUTOFILL_AUDIT_KEY } from "./storage-types.js";
import { addAutofillAuditEntry, clearAutofillAuditEntries, getAutofillAuditEntries } from "./autofill-audit-storage.js";

describe("autofill-audit-storage", () => {
  beforeEach(() => {
    chromeStorageBag.clear();
  });

  it("não inclui suggestedValue nem label nas entradas persistidas", async () => {
    await addAutofillAuditEntry({
      fieldType: "number",
      classificationType: "years_experience:react",
      confidence: "high",
      result: "success",
    });
    const raw = chromeStorageBag.get(STORAGE_AUTOFILL_AUDIT_KEY) as {
      version: 1;
      entries: Record<string, unknown>[];
    };
    const json = JSON.stringify(raw);
    expect(json).not.toContain("suggestedValue");
    const entries = raw.entries;
    expect(entries[0]).not.toHaveProperty("label");
    expect(entries[0]).not.toHaveProperty("suggestedValue");
  });

  it("mantém no máximo 100 eventos", async () => {
    for (let i = 0; i < 105; i++) {
      await addAutofillAuditEntry({
        fieldType: "number",
        classificationType: "years_experience",
        confidence: "high",
        result: "success",
      });
    }
    const list = await getAutofillAuditEntries();
    expect(list.length).toBe(100);
  });

  it("clearAutofillAuditEntries remove a chave", async () => {
    await addAutofillAuditEntry({
      fieldType: "textarea",
      classificationType: "cover_letter",
      confidence: "medium",
      result: "failed",
    });
    await clearAutofillAuditEntries();
    expect(chromeStorageBag.has(STORAGE_AUTOFILL_AUDIT_KEY)).toBe(false);
    await expect(getAutofillAuditEntries()).resolves.toEqual([]);
  });
});
