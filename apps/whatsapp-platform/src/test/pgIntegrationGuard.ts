import { assertLocalDatasourceUrl } from "../../scripts/e2e/assert-local-datasource";

const PG_INTEGRATION_FLAG = "WHATSAPP_PG_INTEGRATION";

export function isPgIntegrationEnabled(): boolean {
  return process.env[PG_INTEGRATION_FLAG] === "1";
}

/** Refuse non-local hosts before any mutating lab. */
export function assertPgIntegrationSafe(): void {
  if (!isPgIntegrationEnabled()) {
    throw new Error(`${PG_INTEGRATION_FLAG} must be "1" to run PostgreSQL evidence labs`);
  }
  const url = process.env.WHATSAPP_DATABASE_URL?.trim();
  if (!url) {
    throw new Error("WHATSAPP_DATABASE_URL ausente para labs PG");
  }
  assertLocalDatasourceUrl(url, "WHATSAPP_DATABASE_URL");
  const direct = process.env.WHATSAPP_DIRECT_URL?.trim();
  if (direct) {
    assertLocalDatasourceUrl(direct, "WHATSAPP_DIRECT_URL");
  }
}

