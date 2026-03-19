/**
 * SLA básico: tempo até primeira resposta e entre respostas.
 * Thread com lastCustomerMessageAt / lastAgentReplyAt / firstResponseAt.
 */

import type { WaInboxThread } from "@/generated/prisma-whatsapp";

export type SlaInfo = {
  firstResponseMinutes: number | null;
  lastResponseMinutes: number | null;
  withinSla: boolean | null;
  waitingSince: Date | null;
};

const DEFAULT_SLA_MINUTES = 30;

/**
 * Tempo em minutos até a primeira resposta (cliente → agente).
 */
export function calculateFirstResponseTime(thread: WaInboxThread): number | null {
  if (!thread.firstResponseAt || !thread.lastCustomerMessageAt) return null;
  const createdOrFirstCustomer = thread.createdAt.getTime() < thread.lastCustomerMessageAt.getTime()
    ? thread.lastCustomerMessageAt
    : thread.createdAt;
  return (thread.firstResponseAt.getTime() - createdOrFirstCustomer.getTime()) / (60 * 1000);
}

/**
 * Tempo em minutos desde a última mensagem do cliente até a última resposta do agente.
 */
export function calculateResponseTime(thread: WaInboxThread): number | null {
  if (!thread.lastCustomerMessageAt || !thread.lastAgentReplyAt) return null;
  return (thread.lastAgentReplyAt.getTime() - thread.lastCustomerMessageAt.getTime()) / (60 * 1000);
}

/**
 * Status SLA: dentro (true), atrasado (false), ou indeterminado (null).
 * Considera SLA default (ex.: 30 min) para “tempo de resposta” atual (aguardando resposta).
 */
export function getSlaStatus(
  thread: WaInboxThread,
  slaMinutes: number = DEFAULT_SLA_MINUTES
): SlaInfo {
  const firstResponseMinutes = calculateFirstResponseTime(thread);
  const lastResponseMinutes = calculateResponseTime(thread);
  let withinSla: boolean | null = null;
  let waitingSince: Date | null = null;

  if (thread.lastCustomerMessageAt && !thread.lastAgentReplyAt) {
    waitingSince = thread.lastCustomerMessageAt;
    const waitingMinutes = (Date.now() - thread.lastCustomerMessageAt.getTime()) / (60 * 1000);
    withinSla = waitingMinutes <= slaMinutes;
  } else if (firstResponseMinutes !== null) {
    withinSla = firstResponseMinutes <= slaMinutes;
  } else if (lastResponseMinutes !== null) {
    withinSla = lastResponseMinutes <= slaMinutes;
  }

  return {
    firstResponseMinutes,
    lastResponseMinutes,
    withinSla,
    waitingSince,
  };
}
