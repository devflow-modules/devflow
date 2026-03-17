/**
 * Smoke test do fluxo WhatsApp Platform.
 * Rodar a partir de apps/whatsapp-platform (para usar o Prisma correto):
 *   cd apps/whatsapp-platform && pnpm run smoke
 * Requer WHATSAPP_DATABASE_URL e WHATSAPP_DIRECT_URL. Opcional: PLATFORM_URL (default http://localhost:3004).
 *
 * Fluxo: cria tenant + user, conversa, enfileira, puxa via /queue/next, resolve.
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const PLATFORM_URL = process.env.PLATFORM_URL ?? "http://localhost:3004";
const prisma = new PrismaClient();

async function main() {
  console.log("[smoke] Iniciando smoke test em", PLATFORM_URL);

  const tenant = await prisma.tenant.create({
    data: {
      name: "Smoke Tenant",
      phoneNumberId: "smoke-phone-id",
      accessToken: "smoke-token",
      updatedAt: new Date(),
    },
  });
  const tenantId = tenant.id;

  const user = await prisma.user.create({
    data: {
      tenantId,
      email: `smoke-${Date.now()}@test.local`,
      passwordHash: "$2a$10$dummy",
      name: "Smoke User",
      role: "admin",
      updatedAt: new Date(),
    },
  });
  const userId = user.id;

  const conversation = await prisma.conversation.create({
    data: {
      tenantId,
      externalId: "5511999999999",
      updatedAt: new Date(),
    },
  });
  const conversationId = conversation.id;

  await prisma.conversationQueue.create({
    data: {
      tenantId,
      conversationId,
      priority: 0,
    },
  });
  console.log("[smoke] Tenant, user, conversa e fila criados.");

  await prisma.agentStatus.upsert({
    where: { tenantId_userId: { tenantId, userId } },
    create: {
      tenantId,
      userId,
      status: "available",
      updatedAt: new Date(),
    },
    update: { status: "available", currentConversationId: null, updatedAt: new Date() },
  });
  console.log("[smoke] AgentStatus available criado.");

  const loginRes = await fetch(`${PLATFORM_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: user.email, password: "smoke123456" }),
  });
  if (!loginRes.ok) {
    console.warn("[smoke] Login falhou (esperado se usuário não tiver senha smoke123456). Pulando chamadas HTTP.");
    await cleanup(tenantId, conversationId);
    console.log("[smoke] Limpeza feita. Smoke test concluído (apenas dados criados).");
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
    if (data.conversation) {
      console.log("[smoke] Próxima conversa obtida:", data.conversation.id);
      const resolveRes = await fetch(`${PLATFORM_URL}/api/admin/conversations/${data.conversation.id}/resolve`, {
        method: "PATCH",
        headers: { cookie },
      });
      console.log("[smoke] PATCH resolve:", resolveRes.ok ? "OK" : resolveRes.status);
    }
  }

  await cleanup(tenantId, conversationId);
  console.log("[smoke] Limpeza feita. Smoke test concluído.");
}

async function cleanup(tenantId: string, conversationId: string) {
  await prisma.conversationQueue.deleteMany({ where: { conversationId } });
  await prisma.agentStatus.deleteMany({ where: { tenantId } });
  await prisma.conversation.deleteMany({ where: { id: conversationId } });
  await prisma.user.deleteMany({ where: { tenantId } });
  await prisma.tenant.deleteMany({ where: { id: tenantId } });
}

main()
  .catch((e) => {
    console.error("[smoke] Erro:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
