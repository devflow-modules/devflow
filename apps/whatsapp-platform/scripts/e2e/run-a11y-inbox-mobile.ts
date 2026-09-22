import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "../../src/generated/prisma-whatsapp";
import { assertCiLocalDatasources, assertLocalDatasourceUrl } from "./assert-local-datasource";
import { cleanupInboxFixture, type CleanupClient } from "./cleanup-inbox-e2e";
import {
  AUTH_DIR,
  APP_ROOT,
  type FixtureIdentity,
} from "./inbox-e2e-fixture";
import { resolveInboxE2EEnvironment } from "./inbox-e2e-environment";
import { provisionInboxFixture, type ProvisionClient } from "./provision-inbox-e2e";
import { resolveInstalledCli, waitForExit, SAFE_BASE_URL } from "./run-inbox-e2e";

export const A11Y_RECEIPT_PATH = path.join(AUTH_DIR, "a11y-inbox-mobile-fixture.json");
export const A11Y_INBOX_MOBILE_SPEC = "tests/e2e/inbox-mobile-revenue.spec.ts";

export type A11yInboxMobileIdentity = Pick<FixtureIdentity, "email" | "password">;

export type A11yInboxMobileDeps = {
  assertLocal(): void;
  provision(): Promise<A11yInboxMobileIdentity>;
  runPlaywright(identity: A11yInboxMobileIdentity): Promise<number>;
  cleanup(): Promise<void>;
  receiptExists(): boolean;
};

export function assertA11yJwtSecret(env: Record<string, string | undefined> = process.env): void {
  const secret = env.JWT_SECRET?.trim() ?? "";
  if (secret.length < 32) {
    throw new Error("JWT_SECRET ausente ou curto demais para o job a11y");
  }
}

export async function runA11yInboxMobileLifecycle(deps: A11yInboxMobileDeps): Promise<number> {
  deps.assertLocal();
  let provisioned = false;
  try {
    const identity = await deps.provision();
    provisioned = true;
    return await deps.runPlaywright(identity);
  } finally {
    if (provisioned || deps.receiptExists()) {
      await deps.cleanup();
    }
  }
}

export async function runA11yInboxMobile(): Promise<number> {
  const resolved = resolveInboxE2EEnvironment();
  const { datasourceUrl, env } = resolved;
  assertLocalDatasourceUrl(datasourceUrl, "datasource");
  assertCiLocalDatasources({
    ...env,
    WHATSAPP_DATABASE_URL: env.WHATSAPP_DATABASE_URL ?? datasourceUrl,
  });
  assertA11yJwtSecret(env);

  const prisma = new PrismaClient({ datasources: { db: { url: datasourceUrl } } });
  const receiptPath = A11Y_RECEIPT_PATH;

  return runA11yInboxMobileLifecycle({
    assertLocal() {
      assertLocalDatasourceUrl(datasourceUrl, "datasource");
    },
    async provision() {
      return provisionInboxFixture({
        client: prisma as unknown as ProvisionClient,
        datasourceUrl,
        receiptPath,
      });
    },
    async runPlaywright(identity) {
      const playwrightCli = resolveInstalledCli("@playwright/test/cli");
      const child = spawn(process.execPath, [playwrightCli, "test", A11Y_INBOX_MOBILE_SPEC], {
        cwd: APP_ROOT,
        stdio: "inherit",
        env: {
          ...env,
          WHATSAPP_DATABASE_URL: datasourceUrl,
          WHATSAPP_DIRECT_URL: env.WHATSAPP_DIRECT_URL?.trim() || datasourceUrl,
          E2E_WHATSAPP_BASE_URL: env.E2E_WHATSAPP_BASE_URL?.trim() || SAFE_BASE_URL,
          E2E_WHATSAPP_ADMIN_EMAIL: identity.email,
          E2E_WHATSAPP_ADMIN_PASSWORD: identity.password,
        },
      });
      return waitForExit(child);
    },
    async cleanup() {
      await cleanupInboxFixture({
        client: prisma as unknown as CleanupClient,
        datasourceUrl,
        receiptPath,
      });
    },
    receiptExists: () => fs.existsSync(receiptPath),
  }).finally(async () => {
    await prisma.$disconnect();
  });
}

const isDirectExecution =
  Boolean(process.argv[1]) && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isDirectExecution) {
  runA11yInboxMobile()
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : "Falha no ciclo a11y inbox-mobile");
      process.exitCode = 1;
    });
}
