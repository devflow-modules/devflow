/**
 * Regras default (v1) — idempotente por tenant (`isSystem`).
 */

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma-whatsapp";

const DEFAULT_RULES: Array<{
  name: string;
  triggerType: string;
  isActive: boolean;
  conditions: Prisma.InputJsonValue;
  actions: Prisma.InputJsonValue;
}> = [
  {
    name: "[Sistema] SLA crítico — notificar equipa",
    triggerType: "TIME_ELAPSED",
    isActive: true,
    conditions: [
      { field: "conversationState", operator: "equals", value: "awaiting_agent" },
      { field: "slaLevel", operator: "equals", value: "critical" },
    ],
    actions: [
      {
        type: "notify",
        params: {
          title: "SLA crítico",
          body: "Conversa sem responsável com SLA crítico. Routing automático ainda não configurado — assuma manualmente na inbox.",
        },
      },
    ],
  },
  {
    name: "[Sistema] Follow-up — cliente em silêncio (registo)",
    triggerType: "TIME_ELAPSED",
    isActive: false,
    conditions: [
      { field: "conversationState", operator: "equals", value: "awaiting_customer" },
      { field: "lastInboundMinutesAgo", operator: "gte", value: 1440 },
      { field: "lastInboundMinutesAgo", operator: "lte", value: 1460 },
    ],
    actions: [
      {
        type: "logAction",
        params: {
          message:
            "Cliente sem responder há 24h+ (janela 20 min). Pode enviar follow-up manual ou criar regra com sendMessage.",
        },
      },
    ],
  },
  {
    name: "[Sistema] Lead — rever conversa parada",
    triggerType: "TIME_ELAPSED",
    isActive: false,
    conditions: [
      { field: "hasTag", operator: "equals", value: "Lead" },
      { field: "lastInboundMinutesAgo", operator: "gte", value: 120 },
    ],
    actions: [
      {
        type: "logAction",
        params: { message: "Lead sem interação há 2h+ (regra sistema)." },
      },
    ],
  },
  {
    // Follow-up: routing determinístico (fila/round-robin). `userId: auto` é rejeitado em runtime.
    name: "[Sistema] Auto-atribuir conversa nova",
    triggerType: "MESSAGE_INBOUND",
    isActive: false,
    conditions: [{ field: "isUnassigned", operator: "equals", value: true }],
    actions: [
      {
        type: "notify",
        params: {
          title: "Conversa sem responsável",
          body: "Nova conversa unassigned. Atribuição automática ainda não configurada.",
        },
      },
    ],
  },
];

export async function seedDefaultAutomationRules(tenantId: string): Promise<void> {
  const n = await prisma.waAutomationRule.count({
    where: { tenantId, isSystem: true },
  });
  if (n > 0) return;

  for (const r of DEFAULT_RULES) {
    await prisma.waAutomationRule.create({
      data: {
        tenantId,
        name: r.name,
        isActive: r.isActive,
        isSystem: true,
        triggerType: r.triggerType,
        conditions: r.conditions,
        actions: r.actions,
      },
    });
  }
}
