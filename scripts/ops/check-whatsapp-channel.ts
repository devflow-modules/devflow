/**
 * Sanity check operacional: estado do canal WhatsApp (whatsapp_phone_numbers).
 *
 * Executar a partir de apps/whatsapp-platform (env + Prisma client):
 *   cd apps/whatsapp-platform && pnpm run ops:check-channel -- --tenant-id=<id>
 *
 * Requer: WHATSAPP_DATABASE_URL, WHATSAPP_DIRECT_URL
 * Carrega `.env.local` da raiz do monorepo e do app (mesma ideia do `pnpm dev`).
 */

import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const cwd = process.cwd();
const rootEnvLocal = resolve(cwd, "../../.env.local");
const appEnvLocal = resolve(cwd, ".env.local");
if (existsSync(rootEnvLocal)) loadEnv({ path: rootEnvLocal });
if (existsSync(appEnvLocal)) loadEnv({ path: appEnvLocal, override: true });
import {
  PrismaClient,
  WhatsappPhoneNumberStatus,
} from "../../apps/whatsapp-platform/src/generated/prisma-whatsapp";

function ensurePgbouncerParam(): void {
  const dbUrl = process.env.WHATSAPP_DATABASE_URL ?? "";
  if (dbUrl.includes("pooler") && !dbUrl.includes("pgbouncer=true")) {
    process.env.WHATSAPP_DATABASE_URL = dbUrl.includes("?")
      ? `${dbUrl}&pgbouncer=true`
      : `${dbUrl}?pgbouncer=true`;
    console.warn("[ops:check-channel] WHATSAPP_DATABASE_URL ajustado com pgbouncer=true.");
  }
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v?.trim()) {
    console.error(`[ops:check-channel] Variável obrigatória ausente: ${name}`);
    process.exit(2);
  }
  return v;
}

function maskToken(t: string | null | undefined): string {
  if (t == null || !String(t).trim()) return "(nenhum)";
  const s = String(t);
  if (s.length <= 12) return "***";
  return `${s.slice(0, 6)}…${s.slice(-4)}`;
}

function parseArgs(argv: string[]): {
  tenantId?: string;
  phoneNumberId?: string;
  channelId?: string;
  failIfNotActive: boolean;
} {
  let tenantId: string | undefined;
  let phoneNumberId: string | undefined;
  let channelId: string | undefined;
  let failIfNotActive = false;

  for (const a of argv) {
    if (a === "--fail-if-not-active") failIfNotActive = true;
    else if (a.startsWith("--tenant-id=")) tenantId = a.slice("--tenant-id=".length).trim();
    else if (a.startsWith("--phone-number-id=")) phoneNumberId = a.slice("--phone-number-id=".length).trim();
    else if (a.startsWith("--channel-id=")) channelId = a.slice("--channel-id=".length).trim();
  }

  return { tenantId, phoneNumberId, channelId, failIfNotActive };
}

function rowLine(r: {
  id: string;
  tenantId: string;
  phoneNumberId: string;
  displayPhoneNumber: string | null;
  wabaId: string | null;
  status: WhatsappPhoneNumberStatus;
  accessToken: string | null;
  isPrimary: boolean;
  isDefaultOutbound: boolean;
}): string {
  const tokenOk = Boolean(r.accessToken?.trim());
  const ready =
    r.status === WhatsappPhoneNumberStatus.ACTIVE && tokenOk ? "SIM" : "não";
  return [
    `  id (channelId):     ${r.id}`,
    `  tenantId:           ${r.tenantId}`,
    `  phoneNumberId:    ${r.phoneNumberId}`,
    `  display:            ${r.displayPhoneNumber ?? "(null)"}`,
    `  wabaId:             ${r.wabaId ?? "(null)"}`,
    `  status:             ${r.status}`,
    `  accessToken:        ${maskToken(r.accessToken)}`,
    `  pronto p/ envio:    ${ready}`,
    `  primary / default:  ${r.isPrimary ? "sim" : "não"} / ${r.isDefaultOutbound ? "sim" : "não"}`,
  ].join("\n");
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const { tenantId, phoneNumberId, channelId, failIfNotActive } = parseArgs(argv);

  if (!tenantId && !phoneNumberId && !channelId) {
    console.error(
      "[ops:check-channel] Uso: cd apps/whatsapp-platform && pnpm run ops:check-channel -- --tenant-id=<id> | --phone-number-id=<id> | --channel-id=<id> [--fail-if-not-active]"
    );
    process.exit(2);
  }

  requireEnv("WHATSAPP_DATABASE_URL");
  requireEnv("WHATSAPP_DIRECT_URL");
  ensurePgbouncerParam();

  const prisma = new PrismaClient();
  try {
    let rows: Awaited<ReturnType<typeof prisma.whatsappPhoneNumber.findMany>>;

    if (channelId) {
      const one = await prisma.whatsappPhoneNumber.findUnique({ where: { id: channelId } });
      rows = one ? [one] : [];
    } else if (phoneNumberId) {
      const one = await prisma.whatsappPhoneNumber.findUnique({
        where: { phoneNumberId: phoneNumberId.trim() },
      });
      rows = one ? [one] : [];
    } else if (tenantId) {
      rows = await prisma.whatsappPhoneNumber.findMany({
        where: { tenantId: tenantId.trim() },
        orderBy: { createdAt: "asc" },
      });
    } else {
      rows = [];
    }

    if (rows.length === 0) {
      console.log("[ops:check-channel] Nenhum registo encontrado.");
      process.exit(1);
    }

    console.log(`[ops:check-channel] ${rows.length} linha(s):\n`);
    for (const r of rows) {
      console.log(rowLine(r));
      console.log("");
    }

    if (failIfNotActive) {
      const anyReady = rows.some(
        (r) => r.status === WhatsappPhoneNumberStatus.ACTIVE && Boolean(r.accessToken?.trim())
      );
      if (!anyReady) {
        console.error(
          "[ops:check-channel] --fail-if-not-active: nenhuma linha ACTIVE com token."
        );
        process.exit(1);
      }
    }

    process.exit(0);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("[ops:check-channel] Erro:", e instanceof Error ? e.message : e);
  process.exit(2);
});
