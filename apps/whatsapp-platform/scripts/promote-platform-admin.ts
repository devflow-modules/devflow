/**
 * Promove um utilizador existente a `platform_admin` (staff interno).
 *
 * Uso (na pasta apps/whatsapp-platform):
 *   pnpm ops:promote-admin -- <email>
 *
 * Carrega `.env.local` do monorepo e da app (mesma ordem que outros scripts).
 */
import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "../src/generated/prisma-whatsapp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, "..");
const rootEnv = path.resolve(__dirname, "../../../.env.local");
const appEnv = path.resolve(appRoot, ".env.local");
config({ path: rootEnv });
config({ path: appEnv });

const args = process.argv.slice(2).filter((a) => a !== "--");
const email = args[0]?.trim().toLowerCase();
if (!email || !email.includes("@")) {
  console.error("Uso: pnpm ops:promote-admin -- <email>");
  process.exit(1);
}

/** Preferir conexão direta (porta 5432) para scripts; o pooler pode dar 42P05 com prepared statements. */
const datasourceUrl =
  process.env.WHATSAPP_DIRECT_URL?.trim() || process.env.WHATSAPP_DATABASE_URL?.trim();
if (!datasourceUrl) {
  console.error("Defina WHATSAPP_DATABASE_URL ou WHATSAPP_DIRECT_URL no .env.local.");
  process.exit(1);
}
const prisma = new PrismaClient({
  datasources: { db: { url: datasourceUrl } },
});

async function main() {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, role: true, tenantId: true },
  });
  if (!user) {
    console.error(`Nenhum utilizador com e-mail: ${email}`);
    console.error("Crie primeiro a conta (signup) e volte a executar este comando.");
    process.exit(1);
  }
  if (user.role === "platform_admin") {
    console.info(`Já é platform_admin: ${user.email} (${user.id})`);
    return;
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { role: "platform_admin" },
  });
  console.info(`Promovido a platform_admin: ${user.email} (${user.id}), tenant ${user.tenantId}`);
  console.info("Faça logout/login para garantir que a UI reflete a nova role em todos os contextos.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
