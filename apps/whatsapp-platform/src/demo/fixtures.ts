import type { OperationalAgentRow } from "@/modules/inbox/operationsAgentsService";
import type { OperationalQueueWithMetrics } from "@/modules/inbox/inboxOperationalQueueService";
import type { ManagerDashboardPayload } from "@/modules/metrics/managerDashboardService";
import type { WaInboxMessageRow, WaInboxThreadRow } from "@/components/inbox/inboxTypes";
import {
  DEMO_PHONE_NUMBER_ID,
  DEMO_QUEUE_SUPORTE,
  DEMO_QUEUE_VENDAS,
  DEMO_TENANT_ID,
  DEMO_TENANT_NAME,
  DEMO_THREAD_CLOSED,
  DEMO_THREAD_PRIMARY,
  DEMO_THREAD_UNASSIGNED,
  DEMO_USER_MANAGER_ID,
  DEMO_USER_OPERATOR_ID,
} from "./constants";

const now = Date.now();
const iso = (offsetMs: number) => new Date(now - offsetMs).toISOString();

export const DEMO_WHATSAPP_LINE = {
  phoneNumberId: DEMO_PHONE_NUMBER_ID,
  label: "Linha comercial",
  displayPhoneNumber: "+55 11 90000-0000",
  isPrimary: true,
  isDefaultOutbound: true,
  status: "ACTIVE",
  purpose: "SALES",
} as const;

export const DEMO_INBOX_USERS = [
  { id: DEMO_USER_MANAGER_ID, name: "Ana Gestora", email: "demo.manager@showcase.devflow.local" },
  { id: DEMO_USER_OPERATOR_ID, name: "Bruno Operador", email: "demo.operator@showcase.devflow.local" },
];

export const DEMO_INBOX_TAGS = [
  { id: "demo-tag-urgente", name: "Urgente", color: "#dc2626" },
  { id: "demo-tag-orcamento", name: "Orçamento", color: "#2563eb" },
];

function baseThread(
  partial: Partial<WaInboxThreadRow> & Pick<WaInboxThreadRow, "id" | "phoneNumber" | "contactName" | "lastMessagePreview" | "conversationState">
): WaInboxThreadRow {
  const lastMessageAt = partial.lastMessageAt ?? iso(120_000);
  return {
    businessPhoneNumberId: DEMO_PHONE_NUMBER_ID,
    lastMessageAt,
    unreadCount: partial.unreadCount ?? 1,
    unansweredInboundCount: partial.unansweredInboundCount ?? 1,
    lastResponderType: partial.lastResponderType ?? "agent",
    responseDelayMs: partial.responseDelayMs ?? 180_000,
    slaLevel: partial.slaLevel ?? "medium",
    isUnassigned: partial.isUnassigned ?? false,
    isAssignedToMe: partial.isAssignedToMe ?? true,
    status: partial.status ?? "OPEN",
    priority: partial.priority ?? "MEDIUM",
    leadScore: partial.leadScore ?? 72,
    assignedToUser: partial.assignedToUser ?? DEMO_INBOX_USERS[0],
    queue: partial.queue ?? {
      id: DEMO_QUEUE_VENDAS,
      name: "Vendas",
      slug: "vendas",
      color: "#0ea5e9",
    },
    threadTags: partial.threadTags ?? [{ tag: DEMO_INBOX_TAGS[1] }],
    createdAt: iso(86400_000 * 3),
    updatedAt: lastMessageAt,
    whatsappLine: DEMO_WHATSAPP_LINE,
    ...partial,
  };
}

export const DEMO_INBOX_THREADS: WaInboxThreadRow[] = [
  baseThread({
    id: DEMO_THREAD_PRIMARY,
    phoneNumber: "5511988776655",
    contactName: "Mariana Silva",
    lastMessagePreview: "Quero confirmar o horário da avaliação amanhã.",
    conversationState: "awaiting_agent",
    unreadCount: 2,
    unansweredInboundCount: 1,
    isAssignedToMe: true,
    leadScore: 84,
  }),
  baseThread({
    id: DEMO_THREAD_UNASSIGNED,
    phoneNumber: "5511977665544",
    contactName: "João Pereira",
    lastMessagePreview: "Vocês atendem plano empresarial?",
    conversationState: "awaiting_agent",
    isUnassigned: true,
    isAssignedToMe: false,
    assignedToUser: null,
    queue: { id: DEMO_QUEUE_SUPORTE, name: "Suporte", slug: "suporte", color: "#8b5cf6" },
    unreadCount: 1,
    slaLevel: "high",
    leadScore: 61,
  }),
  baseThread({
    id: DEMO_THREAD_CLOSED,
    phoneNumber: "5511966554433",
    contactName: "Clínica Bem-Estar",
    lastMessagePreview: "Obrigado, fechamos o pacote anual.",
    conversationState: "closed",
    status: "CLOSED",
    unreadCount: 0,
    unansweredInboundCount: 0,
    dealStatus: "won",
    dealValue: 4800,
    dealCurrency: "BRL",
    isAssignedToMe: false,
    assignedToUser: DEMO_INBOX_USERS[1],
  }),
];

export function demoMessagesForThread(threadId: string): WaInboxMessageRow[] {
  const thread = DEMO_INBOX_THREADS.find((t) => t.id === threadId) ?? DEMO_INBOX_THREADS[0];
  return [
    {
      id: `demo-msg-${threadId}-1`,
      waMessageId: `wamid.demo.${threadId}.1`,
      direction: "INBOUND",
      fromNumber: thread.phoneNumber,
      toNumber: DEMO_PHONE_NUMBER_ID,
      messageType: "text",
      contentText: thread.lastMessagePreview ?? "Olá, gostaria de mais informações.",
      contentJson: null,
      ts: iso(300_000),
      status: "delivered",
      errorCode: null,
      errorMessage: null,
      createdAt: iso(300_000),
    },
    {
      id: `demo-msg-${threadId}-2`,
      waMessageId: `wamid.demo.${threadId}.2`,
      direction: "OUTBOUND",
      fromNumber: DEMO_PHONE_NUMBER_ID,
      toNumber: thread.phoneNumber,
      messageType: "text",
      contentText: "Olá! Posso ajudar com horários e valores. Qual serviço procura?",
      contentJson: null,
      ts: iso(240_000),
      status: "read",
      errorCode: null,
      errorMessage: null,
      createdAt: iso(240_000),
    },
    {
      id: `demo-msg-${threadId}-3`,
      waMessageId: `wamid.demo.${threadId}.3`,
      direction: "INBOUND",
      fromNumber: thread.phoneNumber,
      toNumber: DEMO_PHONE_NUMBER_ID,
      messageType: "text",
      contentText: thread.lastMessagePreview ?? "Perfeito, obrigado.",
      contentJson: null,
      ts: iso(120_000),
      status: "delivered",
      errorCode: null,
      errorMessage: null,
      createdAt: iso(120_000),
    },
  ];
}

export const DEMO_AGENTS: OperationalAgentRow[] = [
  {
    userId: DEMO_USER_MANAGER_ID,
    name: "Ana Gestora",
    email: "demo.manager@showcase.devflow.local",
    role: "manager",
    status: "available",
    activeThreadCount: 4,
    queues: [{ id: DEMO_QUEUE_VENDAS, name: "Vendas" }],
    lastActivityAt: iso(60_000),
  },
  {
    userId: DEMO_USER_OPERATOR_ID,
    name: "Bruno Operador",
    email: "demo.operator@showcase.devflow.local",
    role: "operator",
    status: "busy",
    activeThreadCount: 7,
    queues: [
      { id: DEMO_QUEUE_VENDAS, name: "Vendas" },
      { id: DEMO_QUEUE_SUPORTE, name: "Suporte" },
    ],
    lastActivityAt: iso(30_000),
  },
];

export const DEMO_QUEUES: OperationalQueueWithMetrics[] = [
  {
    id: DEMO_QUEUE_VENDAS,
    name: "Vendas",
    slug: "vendas",
    description: "Leads comerciais e orçamentos",
    color: "#0ea5e9",
    slaTargetMinutes: 15,
    isActive: true,
    backlogCount: 6,
    unassignedCount: 2,
    criticalSlaCount: 1,
    members: DEMO_AGENTS.map((a) => ({ userId: a.userId, name: a.name, email: a.email })),
  },
  {
    id: DEMO_QUEUE_SUPORTE,
    name: "Suporte",
    slug: "suporte",
    description: "Pós-venda e dúvidas",
    color: "#8b5cf6",
    slaTargetMinutes: 30,
    isActive: true,
    backlogCount: 3,
    unassignedCount: 1,
    criticalSlaCount: 0,
    members: [{ userId: DEMO_USER_OPERATOR_ID, name: "Bruno Operador", email: DEMO_AGENTS[1].email }],
  },
];

export const DEMO_METRICS_OVERVIEW = {
  overview: {
    totalMessages: 1284,
    automaticMessages: 412,
    humanMessages: 872,
    avgResponseTimeMs: 245_000,
  },
  stats: {
    open: 14,
    pending: 5,
    closed: 89,
    total: 108,
  },
  intents: [
    { intent: "agendamento", count: 42 },
    { intent: "preco", count: 31 },
    { intent: "suporte", count: 18 },
  ],
};

export const DEMO_MANAGER_DASHBOARD: ManagerDashboardPayload = {
  range: { dateFrom: iso(30 * 86400_000), dateTo: iso(0) },
  operation: {
    awaiting: 9,
    unassigned: 3,
    critical: 2,
    avgFirstResponseMs: 198_000,
  },
  team: {
    handled: 64,
    avgResponseMs: 312_000,
    avgFirstResponseMs: 210_000,
    closed: 22,
    agents: [
      {
        userId: DEMO_USER_MANAGER_ID,
        name: "Ana Gestora",
        email: "demo.manager@showcase.devflow.local",
        handled: 28,
        avgResponseMs: 280_000,
        avgFirstResponseMs: 195_000,
        closed: 11,
      },
      {
        userId: DEMO_USER_OPERATOR_ID,
        name: "Bruno Operador",
        email: "demo.operator@showcase.devflow.local",
        handled: 36,
        avgResponseMs: 340_000,
        avgFirstResponseMs: 225_000,
        closed: 11,
      },
    ],
  },
  automation: {
    autoRate: 0.32,
    resolvedByAiRate: 0.18,
    fallbackRate: 0.06,
    playbookUsageRate: 0.24,
    followUpUsageRate: 0.15,
  },
  funnel: {
    lead: 48,
    qualified: 31,
    proposal: 14,
    followUp: 11,
    closed: 9,
    lost: 6,
  },
};

export const DEMO_BILLING_UI = {
  planKey: "OPERATIONAL_BASE",
  planLabel: "Operação (demo)",
  status: "active",
  isEvaluation: false,
  usage: {
    messagesUsed: 420,
    messagesLimit: 5000,
    aiTokensUsed: 18_400,
    aiTokensLimit: 50_000,
  },
  alerts: [],
  stripeCustomerId: null,
  canUpgrade: true,
};

export const DEMO_TENANT_ME = {
  id: DEMO_TENANT_ID,
  name: DEMO_TENANT_NAME,
  plan: "OPERATIONAL_BASE",
  gtmLifecycle: "IMPLANTADO",
  activeUntil: new Date(now + 86400_000 * 90).toISOString(),
  defaultPrompt: "Você é assistente da Clínica Horizonte. Seja cordial e objetivo.",
  systemPrompt: "Você é assistente da Clínica Horizonte. Confirme horários e valores apenas com base no catálogo demo.",
  whatsappPhone: "+5511900000000",
  apiKey: "demo_••••••••••••••••",
  aiDriver: "ruleBased",
  phoneNumbers: [
    {
      id: "demo-wpn-1",
      phoneNumberId: DEMO_PHONE_NUMBER_ID,
      displayPhoneNumber: "+55 11 90000-0000",
      status: "ACTIVE",
      isPrimary: true,
      label: "Linha comercial",
      purpose: "SALES",
    },
  ],
};

export const DEMO_PHONE_NUMBERS_LIST = {
  numbers: [
    {
      id: "demo-wpn-1",
      phoneNumberId: DEMO_PHONE_NUMBER_ID,
      displayPhoneNumber: "+55 11 90000-0000",
      wabaId: "demo-waba",
      status: "ACTIVE",
      isPrimary: true,
      isDefaultOutbound: true,
      label: "Linha comercial",
      purpose: "SALES",
      createdAt: iso(86400_000 * 30),
    },
  ],
};

export const DEMO_PRESENCE = {
  users: DEMO_INBOX_USERS.map((u) => ({
    userId: u.id,
    status: u.id === DEMO_USER_OPERATOR_ID ? "busy" : "available",
    updatedAt: iso(45_000),
  })),
};

export const DEMO_PROSPECT_METRICS = {
  rows: [
    { lens: "hot", count: 5 },
    { lens: "warm", count: 8 },
    { lens: "cold", count: 3 },
  ],
};
