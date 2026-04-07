export type InboxUser = { id: string; name: string; email: string };
export type InboxTag = { id: string; name: string; color: string };

export type WhatsappLineSummary = {
  phoneNumberId: string;
  label: string | null;
  displayPhoneNumber: string | null;
  isPrimary: boolean;
  isDefaultOutbound: boolean;
};

export type WaInboxThreadRow = {
  id: string;
  phoneNumber: string;
  businessPhoneNumberId: string;
  contactName: string | null;
  lastMessageAt: string;
  unreadCount: number;
  lastMessagePreview: string | null;
  status: string;
  priority?: string;
  assignedToUser?: InboxUser | null;
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
  | "assigned_to_me"
  | "unassigned"
  | "OPEN"
  | "PENDING"
  | "CLOSED";

export const INBOX_QK = {
  conversations: (filter?: InboxConversationsFilter, lineFilter?: string | null) =>
    filter
      ? (["inbox-conversations", filter, lineFilter ?? "all-lines"] as const)
      : (["inbox-conversations", lineFilter ?? "all-lines"] as const),
  messages: (threadId: string) => ["inbox-messages", threadId] as const,
  tags: ["inbox-tags"] as const,
  users: ["inbox-users"] as const,
  presence: ["inbox-presence"] as const,
  viewers: (threadId: string) => ["inbox-viewers", threadId] as const,
  typing: (threadId: string) => ["inbox-typing", threadId] as const,
  audit: (threadId: string) => ["inbox-audit", threadId] as const,
  phoneLines: ["inbox-phone-lines"] as const,
};

export type OnlineUserInfo = { userId: string; name?: string; email?: string };
export type ThreadViewer = { userId: string; name?: string };
export type TypingUser = { userId: string; name?: string };
