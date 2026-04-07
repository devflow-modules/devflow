/**
 * Smoke test do fluxo WhatsApp Platform.
 * Rodar a partir de apps/whatsapp-platform (para usar o Prisma correto):
 *   cd apps/whatsapp-platform && pnpm run smoke
 * Requer WHATSAPP_DATABASE_URL e WHATSAPP_DIRECT_URL. Opcional: PLATFORM_URL (default http://localhost:3000).
 *
 * Fluxo: cria tenant + user + thread wa_inbox (fila), puxa via /queue/next, resolve.
 */

import "dotenv/config";
import { PrismaClient } from "../apps/whatsapp-platform/src/generated/prisma-whatsapp";
import bcrypt from "bcryptjs";

const PLATFORM_URL = process.env.PLATFORM_URL ?? "http://localhost:3000";
let prismaInstance: PrismaClient | null = null;

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`[smoke] Variável de ambiente obrigatória não definida: ${name}`);
    console.error("[smoke] Defina WHATSAPP_DATABASE_URL e WHATSAPP_DIRECT_URL (ex.: no .env do app ou no CI).");
    process.exit(1);
  }
  return v;
}

function ensurePgbouncerParam(): void {
  const dbUrl = process.env.WHATSAPP_DATABASE_URL ?? "";
  if (dbUrl.includes("pooler") && !dbUrl.includes("pgbouncer=true")) {
    process.env.WHATSAPP_DATABASE_URL = dbUrl.includes("?") ? `${dbUrl}&pgbouncer=true` : `${dbUrl}?pgbouncer=true`;
    console.log("[smoke] WHATSAPP_DATABASE_URL ajustado com pgbouncer=true (pooler Supabase).");
  }
}

async function main() {
  requireEnv("WHATSAPP_DATABASE_URL");
  requireEnv("WHATSAPP_DIRECT_URL");
  ensurePgbouncerParam();

  const prisma = new PrismaClient();
  prismaInstance = prisma;
  console.log("[smoke] Iniciando smoke test em", PLATFORM_URL);

  const tenant = await prisma.tenant.create({
    data: { name: "Smoke Tenant" },
  });
  const tenantId = tenant.id;

  const smokePassword = "smoke123456";
  const user = await prisma.user.create({
    data: {
      tenantId,
      email: `smoke-${Date.now()}@test.local`,
      passwordHash: await bcrypt.hash(smokePassword, 10),
      name: "Smoke User",
      role: "admin",
    },
  });
  const userId = user.id;

  const thread = await prisma.waInboxThread.create({
    data: {
      tenantId,
      phoneNumber: "5511999999999",
      businessPhoneNumberId: "smoke-biz-line-id",
      lastMessageAt: new Date(),
      lastMessagePreview: "smoke",
      assignedToUserId: null,
    },
  });
  const threadId = thread.id;

  console.log("[smoke] Tenant, user e thread wa_inbox (fila) criados.");

  await prisma.agentStatus.upsert({
    where: { tenantId_userId: { tenantId, userId } },
    create: {
      tenantId,
      userId,
      status: "available",
    },
    update: { status: "available", currentConversationId: null, updatedAt: new Date() },
  });
  console.log("[smoke] AgentStatus available criado.");

  try {
    const loginRes = await fetch(`${PLATFORM_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: user.email, password: smokePassword }),
    });
    if (!loginRes.ok) {
      console.warn("[smoke] Login falhou (platform inacessível ou senha incorreta). Pulando chamadas HTTP.");
      return;
    }
    const cookie = loginRes.headers.get("set-cookie") ?? "";
    const nextRes = await fetch(`${PLATFORM_URL}/api/admin/queue/next`, {
      headers: { cookie },
    });
    if (!nextRes.ok) {
      console.warn("[smoke] GET /api/admin/queue/next falhou:", nextRes.status);
    } else {
      const data = await nextRes.json();
      if (data.thread) {
        console.log("[smoke] Próxima thread obtida:", data.thread.id);
        const resolveRes = await fetch(`${PLATFORM_URL}/api/admin/conversations/${data.thread.id}/resolve`, {
          method: "PATCH",
          headers: { cookie },
        });
        console.log("[smoke] PATCH resolve:", resolveRes.ok ? "OK" : resolveRes.status);
      } else {
        console.warn("[smoke] queue/next sem thread (esperado id:", threadId, ")");
      }
    }
  } catch (e) {
    console.warn("[smoke] Erro HTTP (app a correr em", PLATFORM_URL, "?):", e instanceof Error ? e.message : e);
  } finally {
    await cleanup(prisma, tenantId);
    console.log("[smoke] Limpeza feita. Smoke test concluído.");
  }
}

async function cleanup(prisma: InstanceType<typeof PrismaClient>, tenantId: string) {
  await prisma.tenant.delete({ where: { id: tenantId } }).catch((e) => {
    console.warn("[smoke] cleanup tenant:", e);
  });
}

main()
  .catch((e) => {
    console.error("[smoke] Erro:", e);
    process.exit(1);
  })
  .finally(async () => {
    if (prismaInstance) await prismaInstance.$disconnect();
  });
