import path from "node:path";
import { fileURLToPath } from "node:url";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);

export const CI_DATASOURCE_ENV_KEYS = [
  "WHATSAPP_DATABASE_URL",
  "WHATSAPP_DIRECT_URL",
  "DATABASE_URL",
  "DIRECT_URL",
] as const;

export function assertLocalDatasourceUrl(url: string, label = "WHATSAPP_DATABASE_URL"): void {
  if (!url.trim()) {
    throw new Error(`${label} ausente`);
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`${label} inválido`);
  }
  if (parsed.protocol !== "postgresql:" && parsed.protocol !== "postgres:") {
    throw new Error(`${label} não é PostgreSQL`);
  }
  const hostname = parsed.hostname.trim().toLowerCase().replace(/\.$/, "");
  if (!hostname) {
    throw new Error(`${label} incompleto`);
  }
  if (!LOCAL_HOSTS.has(hostname)) {
    throw new Error(`${label} recusado: host não é localhost`);
  }
}

export function assertCiLocalDatasources(
  env: Record<string, string | undefined> = process.env
): void {
  const primary = env.WHATSAPP_DATABASE_URL?.trim();
  if (!primary) {
    throw new Error("WHATSAPP_DATABASE_URL ausente");
  }
  for (const key of CI_DATASOURCE_ENV_KEYS) {
    const value = env[key]?.trim();
    if (!value) continue;
    assertLocalDatasourceUrl(value, key);
  }
}

const isDirectExecution =
  Boolean(process.argv[1]) && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isDirectExecution) {
  try {
    assertCiLocalDatasources();
    console.info("[a11y-ci] datasource host is local");
  } catch (error: unknown) {
    console.error(error instanceof Error ? error.message : "Datasource recusado");
    process.exitCode = 1;
  }
}
