/**
 * Validates migration 20260929190000 on a local disposable PostgreSQL:
 * - fresh schema via prisma migrate deploy (caller must run first on empty DB)
 * - simulated pre-migration stripe_webhook_events + application of migration SQL
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "../../src/generated/prisma-whatsapp";
import { assertLocalDatasourceUrl } from "../e2e/assert-local-datasource";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function migrationSqlPath(): string {
  return path.join(
    __dirname,
    "../../prisma/migrations/20260929190000_stripe_webhook_state_and_pending_status/migration.sql"
  );
}

async function main(): Promise<void> {
  const url = process.env.WHATSAPP_DATABASE_URL?.trim();
  if (!url) {
    console.error("WHATSAPP_DATABASE_URL ausente");
    process.exitCode = 1;
    return;
  }
  assertLocalDatasourceUrl(url);

  const prisma = new PrismaClient();
  try {
    const versionRow = await prisma.$queryRaw<{ version: string }[]>`SELECT version()`;
    const pgVersion = versionRow[0]?.version ?? "unknown";

    const statusCol = await prisma.$queryRaw<{ column_name: string }[]>`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'stripe_webhook_events' AND column_name = 'status'
    `;
    const pendingTable = await prisma.$queryRaw<{ table_name: string }[]>`
      SELECT table_name FROM information_schema.tables
      WHERE table_name = 'wa_inbox_pending_statuses'
    `;

    const freshOk = statusCol.length === 1 && pendingTable.length === 1;

    let upgradeOk = false;
    let upgradePreserved = false;
    const upgradeDb = process.env.WHATSAPP_PG_UPGRADE_DATABASE?.trim();
    if (upgradeDb && /^[a-z0-9_]+$/i.test(upgradeDb)) {
      await prisma.$executeRawUnsafe(`CREATE DATABASE ${upgradeDb}`);
      const upgradeUrl = new URL(url);
      upgradeUrl.pathname = `/${upgradeDb}`;
      const upgradePrisma = new PrismaClient({ datasources: { db: { url: upgradeUrl.toString() } } });
      try {
        await upgradePrisma.$executeRawUnsafe(`
          CREATE TABLE "stripe_webhook_events" (
            "id" TEXT NOT NULL,
            "stripe_event_id" TEXT NOT NULL,
            "event_type" VARCHAR(128) NOT NULL,
            "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "stripe_webhook_events_pkey" PRIMARY KEY ("id")
          );
        `);
        await upgradePrisma.$executeRawUnsafe(`
          CREATE UNIQUE INDEX "stripe_webhook_events_stripe_event_id_key"
          ON "stripe_webhook_events"("stripe_event_id");
        `);
        const legacyId = "legacy-row-1";
        await upgradePrisma.$executeRawUnsafe(`
          INSERT INTO "stripe_webhook_events" ("id", "stripe_event_id", "event_type", "processed_at")
          VALUES ('${legacyId}', 'evt_pg_upgrade_${Date.now()}', 'customer.subscription.updated', CURRENT_TIMESTAMP);
        `);

        const stripeUpgradeStatements = readFileSync(migrationSqlPath(), "utf8")
          .split("\n")
          .filter((line) => {
            const t = line.trim();
            return t.startsWith("ALTER TABLE \"stripe_webhook_events\"") || t.startsWith("CREATE INDEX IF NOT EXISTS \"stripe_webhook_events");
          })
          .map((line) => (line.endsWith(";") ? line : `${line};`));
        for (const stmt of stripeUpgradeStatements) {
          await upgradePrisma.$executeRawUnsafe(stmt);
        }

        const row = await upgradePrisma.$queryRaw<
          { id: string; status: string; attempt_count: number }[]
        >`SELECT id, status, attempt_count FROM stripe_webhook_events WHERE id = ${legacyId}`;
        upgradePreserved = row.length === 1 && row[0].status === "PROCESSED";
        upgradeOk = upgradePreserved;
      } finally {
        await upgradePrisma.$disconnect();
        await prisma.$executeRawUnsafe(`DROP DATABASE IF EXISTS ${upgradeDb} WITH (FORCE)`);
      }
    }

    console.log(
      JSON.stringify(
        {
          pgVersion,
          freshSchemaCheck: freshOk,
          upgradeSimulated: Boolean(upgradeDb),
          upgradeOk,
          upgradeDataPreserved: upgradePreserved,
        },
        null,
        2
      )
    );

    if (!freshOk) process.exitCode = 1;
    if (upgradeDb && !upgradeOk) process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
