/**
 * Módulo queues — filas, roteamento e distribuição para agentes.
 */
export const QUEUES_MODULE = "queues";
export {
  listQueuesByTenant,
  getQueueById,
  getQueueBySlug,
  createQueue,
  updateQueue,
  deleteQueue,
  countConversationsInQueue,
} from "./queuesRepository";
export { resolveQueueForConversation } from "./queueRoutingService";
export { selectNextAgent, type DistributionStrategy } from "./distributionService";
