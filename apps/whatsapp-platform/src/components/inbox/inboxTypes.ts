import type { ProspectData } from "@/modules/inbox/prospectSales";
import type { InboxProspectLens } from "@/modules/inbox/inboxProspectLens";

export type { InboxProspectLens };

export type InboxUser = { id: string; name: string; email: string };
export type InboxTag = { id: string; name: string; color: string };

export type WhatsappLineSummary = {
  phoneNumberId: string;
  label: string | null;
  displayPhoneNumber: string | null;
  isPrimary: boolean;
  isDefaultOutbound: boolean;
  status: string;
};

/** Fila operacional (WaInboxQueue) associada à thread. */
export type InboxThreadQueue = {
  id: string;
  name: string;
  slug: string;
  color: string | null;
};

/** Alinhado com `waInboxConversationState` / API inbox. */
export type InboxConversationState =
  | "awaiting_agent"
  | "in_progress"
  | "awaiting_customer"
  | "closed";

export type InboxLastResponderType = "agent" | "ai" | "automation" | null;

export type InboxSlaLevel = "low" | "medium" | "high" | "critical";

export type WaInboxThreadRow = {
  id: string;
  phoneNumber: string;
  businessPhoneNumberId: string;
  contactName: string | null;
  lastMessageAt: string;
  unreadCount: number;
  /** Mensagens inbound sem resposta outbound (pendência real). */
  unansweredInboundCount?: number;
  conversationState?: InboxConversationState;
  lastResponderType?: InboxLastResponderType;
  /** ms desde a última inbound pendente; só em awaiting_agent. */
  responseDelayMs?: number | null;
  slaLevel?: InboxSlaLevel | null;
  isUnassigned?: boolean;
  isAssignedToMe?: boolean;
  lastUnansweredInboundAt?: string | null;
  lastMessagePreview: string | null;
  status: string;
  priority?: string;
  /** ID do `Lead` no portal (`outbound_leads`), quando ligado à prospecção DevFlow. */
  outboundLeadId?: string | null;
  /** Fecho comercial: null / ausente = em negociação; `won` / `lost` após registo. */
  dealStatus?: string | null;
  dealValue?: number | null;
  dealCurrency?: string | null;
  dealClosedAt?: string | null;
  /** Motivo de perda após fecho confirmado (enum). */
  dealLostReason?: string | null;
  /** Proposta de fecho pelo operador — aguarda confirmação do manager. */
  dealSuggested?: boolean | null;
  dealSuggestedAt?: string | null;
  dealSuggestedBy?: string | null;
  dealSuggestedStatus?: "won" | "lost" | string | null;
  dealSuggestedValue?: number | null;
  dealSuggestedLostReason?: string | null;
  /** CRM: pontuação automática (recalculada em cada inbound) */
  leadScore?: number;
  /** CRM: campos extraídos heurísticamente */
  leadData?: {
    name?: string;
    interest?: string;
    budget?: string;
    urgency?: string;
    prospect?: ProspectData;
  } | null;
  /** Snapshot do funil IA na thread */
  aiState?: string | null;
  assignedToUser?: InboxUser | null;
  queue?: InboxThreadQueue | null;
  threadTags?: { tag: InboxTag }[];
  lastCustomerMessageAt?: string | null;
  lastAgentReplyAt?: string | null;
  firstResponseAt?: string | null;
  createdAt: string;
  updatedAt: string;
  whatsappLine?: WhatsappLineSummary;
};

export type WaInboxMessageRow = {
  id: string;
  waMessageId: string;
  direction: "INBOUND" | "OUTBOUND";
  fromNumber: string;
  toNumber: string;
  messageType: string;
  contentText: string | null;
  contentJson: unknown;
  ts: string;
  status: string;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
};

export type InboxConversationsFilter =
  | "all"
  | "needs_response"
  | "mine"
  | "unassigned"
  | "in_attendance"
  | "awaiting_customer"
  | "closed";

export type InternalNoteRow = {
  id: string;
  body: string;
  userId: string;
  authorName: string | null;
  createdAt: string;
  updatedAt: string;
};

export const INBOX_QK = {
  conversations: (
    filter?: InboxConversationsFilter,
    lineFilter?: string | null,
    queueFilter?: string | null,
    priorityFilter?: string | null,
    prospectLens?: InboxProspectLens | null
  ) =>
    [
      "inbox-conversations",
      filter ?? "all",
      lineFilter ?? "all-lines",
      queueFilter ?? "all-queues",
      priorityFilter ?? "all-priority",
      prospectLens ?? "all-prospect",
    ] as const,
  thread: (threadId: string) => ["inbox-thread", threadId] as const,
  messages: (threadId: string) => ["inbox-messages", threadId] as const,
  internalNotes: (threadId: string) => ["inbox-internal-notes", threadId] as const,
  tags: ["inbox-tags"] as const,
  users: ["inbox-users"] as const,
  presence: ["inbox-presence"] as const,
  viewers: (threadId: string) => ["inbox-viewers", threadId] as const,
  typing: (threadId: string) => ["inbox-typing", threadId] as const,
  audit: (threadId: string) => ["inbox-audit", threadId] as const,
  phoneLines: ["inbox-phone-lines"] as const,
  team: ["inbox-team"] as const,
};

export type OnlineUserInfo = { userId: string; name?: string; email?: string };
export type ThreadViewer = { userId: string; name?: string };
export type TypingUser = { userId: string; name?: string };
