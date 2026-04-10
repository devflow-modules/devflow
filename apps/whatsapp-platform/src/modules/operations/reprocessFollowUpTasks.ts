import { prisma } from "@/lib/prisma";

const MAX_REQUEUE = 100;

/**
 * Coloca tarefas pendentes do tenant na janela imediata (próxima execução do worker).
 * Não marca como executadas nem apaga histórico.
 */
export async function requeuePendingFollowUpTasksForTenant(tenantId: string): Promise<{ updated: number }> {
  const now = new Date();
  const pending = await prisma.followUpTask.findMany({
    where: { tenantId, executed: false },
    orderBy: { scheduledAt: "asc" },
    take: MAX_REQUEUE,
    select: { id: true },
  });
  if (pending.length === 0) return { updated: 0 };

  const jitter = (i: number) => new Date(now.getTime() + i * 1500);
  let i = 0;
  for (const p of pending) {
    await prisma.followUpTask.update({
      where: { id: p.id },
      data: { scheduledAt: jitter(i) },
    });
    i += 1;
  }
  return { updated: pending.length };
}
