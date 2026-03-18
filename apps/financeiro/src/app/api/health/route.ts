import { sendSuccess } from "@/modules/financeiro/lib/api-response";
import { prisma } from "@/modules/financeiro/adapters/prisma/prismaFinanceiro";

export async function GET() {
  const ts = new Date().toISOString();
  let db: "connected" | "error" = "connected";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    console.warn("[health] DB check failed", error);
    db = "error";
  }

  return sendSuccess({
    status: db === "connected" ? "ok" : "degraded",
    db,
    timestamp: ts,
  });
}
