import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  A11Y_INBOX_MOBILE_SPEC,
  A11Y_RECEIPT_PATH,
  assertA11yJwtSecret,
  runA11yInboxMobileLifecycle,
} from "./run-a11y-inbox-mobile";

const workflowPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../.github/workflows/whatsapp-platform-a11y.yml"
);

describe("assertA11yJwtSecret", () => {
  it("requires a dummy secret of at least 32 characters", () => {
    expect(() => assertA11yJwtSecret({})).toThrow(/JWT_SECRET/);
    expect(() => assertA11yJwtSecret({ JWT_SECRET: "short" })).toThrow(/JWT_SECRET/);
    expect(() =>
      assertA11yJwtSecret({ JWT_SECRET: "ci-whatsapp-a11y-dummy-secret-min-32-chars" })
    ).not.toThrow();
  });
});

describe("runA11yInboxMobileLifecycle", () => {
  it("does not provision when the local-host guard fails", async () => {
    const events: string[] = [];
    await expect(
      runA11yInboxMobileLifecycle({
        assertLocal() {
          events.push("guard");
          throw new Error("WHATSAPP_DATABASE_URL recusado: host não é localhost");
        },
        async provision() {
          events.push("provision");
          return { email: "x@example.invalid", password: "unused" };
        },
        async runPlaywright() {
          events.push("playwright");
          return 0;
        },
        async cleanup() {
          events.push("cleanup");
        },
        receiptExists: () => false,
      })
    ).rejects.toThrow(/host não é localhost/);
    expect(events).toEqual(["guard"]);
  });

  it("cleans up receipt-scoped identity when Playwright fails", async () => {
    const events: string[] = [];
    await expect(
      runA11yInboxMobileLifecycle({
        assertLocal() {
          events.push("guard");
        },
        async provision() {
          events.push("provision");
          return { email: "inbox-e2e-aaa@example.invalid", password: "unused" };
        },
        async runPlaywright() {
          events.push("playwright");
          throw new Error("playwright failed");
        },
        async cleanup() {
          events.push("cleanup");
        },
        receiptExists: () => true,
      })
    ).rejects.toThrow("playwright failed");
    expect(events).toEqual(["guard", "provision", "playwright", "cleanup"]);
  });

  it("provisions, runs the Fatia 5 spec and cleans up on success", async () => {
    const events: string[] = [];
    const code = await runA11yInboxMobileLifecycle({
      assertLocal() {
        events.push("guard");
      },
      async provision() {
        events.push("provision");
        return { email: "inbox-e2e-bbb@example.invalid", password: "unused" };
      },
      async runPlaywright() {
        events.push("playwright");
        return 0;
      },
      async cleanup() {
        events.push("cleanup");
      },
      receiptExists: () => true,
    });
    expect(code).toBe(0);
    expect(events).toEqual(["guard", "provision", "playwright", "cleanup"]);
  });
});

describe("a11y inbox-mobile CI contract", () => {
  it("targets the Fatia 5 spec and a dedicated receipt path", () => {
    expect(A11Y_INBOX_MOBILE_SPEC).toBe("tests/e2e/inbox-mobile-revenue.spec.ts");
    expect(path.basename(A11Y_RECEIPT_PATH)).toBe("a11y-inbox-mobile-fixture.json");
  });

  it("does not inject remote WhatsApp DB or admin secrets in the a11y workflow", () => {
    const source = fs.readFileSync(workflowPath, "utf8");
    expect(source).not.toMatch(/\$\{\{\s*secrets\.WHATSAPP_DATABASE_URL\s*\}\}/);
    expect(source).not.toMatch(/\$\{\{\s*secrets\.E2E_WHATSAPP_ADMIN_/);
    expect(source).not.toMatch(/\$\{\{\s*secrets\.JWT_SECRET\s*\}\}/);
    expect(source).toMatch(/postgres:16/);
    expect(source).toMatch(/127\.0\.0\.1:5432/);
    expect(source).toMatch(/run-a11y-inbox-mobile\.ts/);
    expect(source).not.toMatch(/example\.supabase|pooler\.supabase/);
  });
});
