import { beforeEach, describe, expect, it } from "vitest";

import { addAiAuditEntry, clearAiAuditEntries, getAiAuditEntries } from "./ai-audit-storage.js";
import { chromeStorageBag } from "../test/chrome-storage-mock.js";
import { STORAGE_AI_AUDIT_KEY } from "./storage-types.js";

describe("ai-audit-storage", () => {
  beforeEach(() => {
    chromeStorageBag.clear();
  });

  it("regista sucesso sem campos de prompt ou output", async () => {
    await addAiAuditEntry({ task: "cover_letter", result: "success", generatedLength: 42 });
    const entries = await getAiAuditEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].task).toBe("cover_letter");
    expect(entries[0].result).toBe("success");
    expect(entries[0].generatedLength).toBe(42);
    expect(entries[0]).not.toHaveProperty("prompt");
    expect(JSON.stringify(entries[0])).not.toMatch(/choices|message|content/i);
  });

  it("mantém no máximo 100 eventos", async () => {
    await clearAiAuditEntries();
    for (let i = 0; i < 105; i++) {
      await addAiAuditEntry({ task: "open_answer", result: "failed", reason: `r${i}` });
    }
    const entries = await getAiAuditEntries();
    expect(entries.length).toBe(100);
    const bag = chromeStorageBag.get(STORAGE_AI_AUDIT_KEY) as { entries: unknown[] };
    expect(bag.entries.length).toBe(100);
  });
});
