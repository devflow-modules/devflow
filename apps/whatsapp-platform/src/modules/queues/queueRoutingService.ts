/**
 * Roteamento de conversas para filas.
 * Escolhe a fila apropriada quando uma nova mensagem chega (ex.: por intent ou fila padrão).
 */

import { listQueuesByTenant } from "./queuesRepository";
import type { Queue } from "@/lib/db/types";

export type RoutingStrategy = "default" | "first_available";

/**
 * Retorna a fila para onde a conversa deve ser direcionada.
 * Por enquanto usa a primeira fila do tenant (slug "default" ou primeira da lista).
 */
export async function resolveQueueForConversation(
  tenantId: string,
  _messageText?: string
): Promise<Queue | null> {
  const queues = await listQueuesByTenant(tenantId);
  if (queues.length === 0) return null;
  const defaultQueue = queues.find((q) => q.slug === "default") ?? queues[0];
  return defaultQueue;
}
