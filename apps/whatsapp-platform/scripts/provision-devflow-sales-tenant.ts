/**
 * Cria o tenant interno "DevFlow Sales" (comercial) e, opcionalmente, utilizadores manager + operator.
 *
 * Requer a migração `tenant_is_internal` aplicada. Usa a mesma base e roles que o produto.
 *
 * Uso (a partir de `apps/whatsapp-platform`):
 *   pnpm db:migrate
 *   pnpm ops:provision-devflow-sales
 *
 * Com utilizadores (passwords fortes, ambiente controlado):
 *   pnpm ops:provision-devflow-sales -- --manager-email "e1@exemplo.com" --manager-password "***" --operator-email "e2@exemplo.com" --operator-password "***"
 */
import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "../src/generated/prisma-whatsapp";
import { hashPassword } from "../src/modules/auth/authService";
import { ensureTenantSubscription } from "../src/modules/billing/subscriptionService";
import { seedDefaultAutomationRules } from "../src/modules/automation/defaultRules.seed";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, "..");
const rootEnv = path.resolve(__dirname, "../../../.env.local");
const appEnv = path.resolve(appRoot, ".env.local");
config({ path: rootEnv });
config({ path: appEnv });

const TENANT_NAME = "DevFlow Sales";

const datasourceUrl =
  process.env.WHATSAPP_DIRECT_URL?.trim() || process.env.WHATSAPP_DATABASE_URL?.trim();
if (!datasourceUrl) {
  console.error("Defina WHATSAPP_DATABASE_URL ou WHATSAPP_DIRECT_URL no .env.local.");
  process.exit(1);
}

const prisma = new PrismaClient({
  datasources: { db: { url: datasourceUrl } },
});

function parseArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a?.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        out[key] = next;
        i += 1;
      } else {
        out[key] = "true";
      }
    }
  }
  return out;
}

async function ensureUser(args: {
  email: string;
  password: string;
  name: string;
  role: "manager" | "operator";
  tenantId: string;
}): Promise<void> {
  const emailLower = args.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email: emailLower } });
  if (existing) {
    if (existing.tenantId !== args.tenantId) {
      console.error(`E-mail ${emailLower} já existe noutro tenant. Escolha outro.`);
      process.exit(1);
    }
    if (existing.role !== args.role) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { role: args.role, name: args.name },
      });
      console.info(`Atualizado papel para ${args.role}: ${emailLower}`);
    } else {
      console.info(`Já existe no tenant: ${args.role} ${emailLower}`);
    }
    return;
  }
  const passwordHash = await hashPassword(args.password);
  const user = await prisma.user.create({
    data: {
      tenantId: args.tenantId,
      email: emailLower,
      passwordHash,
      name: args.name,
      role: args.role,
    },
  });
  console.info(`Criado ${args.role}: ${user.email} (${user.id})`);
}

async function main() {
  const flags = parseArgs(process.argv.slice(2).filter((a) => a !== "--"));
  const managerEmail = flags["manager-email"]?.trim();
  const managerPassword = flags["manager-password"];
  const operatorEmail = flags["operator-email"]?.trim();
  const operatorPassword = flags["operator-password"];
  if ((managerEmail && !managerPassword) || (managerPassword && !managerEmail)) {
    console.error("Use juntos: --manager-email e --manager-password, ou omita ambos.");
    process.exit(1);
  }
  if ((operatorEmail && !operatorPassword) || (operatorPassword && !operatorEmail)) {
    console.error("Use juntos: --operator-email e --operator-password, ou omita ambos.");
    process.exit(1);
  }
  if (operatorEmail && managerEmail && operatorEmail === managerEmail) {
    console.error("manager e operator precisam de e-mails distintos.");
    process.exit(1);
  }
  if (managerPassword && managerPassword.length < 8) {
    console.error("manager-password: mínimo 8 caracteres (política comum de demo).");
    process.exit(1);
  }
  if (operatorPassword && operatorPassword.length < 8) {
    console.error("operator-password: mínimo 8 caracteres.");
    process.exit(1);
  }

  let tenant = await prisma.tenant.findFirst({
    where: { name: TENANT_NAME, isInternal: true },
  });
  if (!tenant) {
    const byName = await prisma.tenant.findFirst({ where: { name: TENANT_NAME } });
    if (byName) {
      await prisma.tenant.update({
        where: { id: byName.id },
        data: { isInternal: true },
      });
      tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: byName.id } });
      console.info(`Tenant existente «${TENANT_NAME}» marcado como interno.`);
    } else {
      tenant = await prisma.tenant.create({
        data: {
          name: TENANT_NAME,
          isInternal: true,
          plan: "free",
        },
      });
      console.info(`Criado tenant: ${TENANT_NAME} (${tenant.id})`);
    }
  } else {
    console.info(`Tenant interno já existe: ${TENANT_NAME} (${tenant.id})`);
  }

  await ensureTenantSubscription(tenant.id, "FREE");
  await seedDefaultAutomationRules(tenant.id).catch((e) => console.error("[seedDefaultAutomationRules]", e));

  if (managerEmail && managerPassword) {
    await ensureUser({
      email: managerEmail,
      password: managerPassword,
      name: "DevFlow Sales — Closer",
      role: "manager",
      tenantId: tenant.id,
    });
  }
  if (operatorEmail && operatorPassword) {
    await ensureUser({
      email: operatorEmail,
      password: operatorPassword,
      name: "DevFlow Sales — Prospecção",
      role: "operator",
      tenantId: tenant.id,
    });
  }
  if (!managerEmail && !operatorEmail) {
    console.info(
      "Sem utilizadores criados. Execute de novo com --manager-email / --operator-email (ou use /signup e ligue ao tenant manualmente)."
    );
  } else {
    console.info(
      "Faça login nesse tenant. platform_admin (global) continua a ser atribuído com pnpm ops:promote-admin se for necessário internamente."
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
