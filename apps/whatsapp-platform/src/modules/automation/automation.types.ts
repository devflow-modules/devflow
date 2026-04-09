/**
 * Tipos para o engine de automação (Rule Engine v1).
 */

export type AutomationTriggerType =
  | "MESSAGE_INBOUND"
  | "MESSAGE_OUTBOUND"
  | "CONVERSATION_CREATED"
  | "STATUS_CHANGED"
  | "TAG_ADDED"
  | "TAG_REMOVED"
  | "TIME_ELAPSED";

export type ConditionOperator =
  | "contains"
  | "equals"
  | "notEquals"
  | "exists"
  | "isNull"
  | "timeSinceLastMessage_gt"
  | "gte"
  | "lte"
  | "gt"
  | "lt";

export type Condition = {
  field: string;
  operator: ConditionOperator;
  value?: string | number | boolean | null;
};

export type ActionType =
  | "assignConversation"
  | "assign_to_user"
  | "updateStatus"
  | "addTag"
  | "add_tag"
  | "removeTag"
  | "setPriority"
  | "sendMessage"
  | "send_message"
  | "triggerAIResponse"
  | "logAction"
  | "notify";

export type Action = {
  type: ActionType;
  params?: Record<string, unknown>;
};

export type AutomationRuleRow = {
  id: string;
  tenantId: string;
  name: string;
  isActive: boolean;
  isSystem?: boolean;
  triggerType: string;
  conditions: Condition[];
  actions: Action[];
};

/** Subconjunto enriquecido para avaliação de condições (inbox + SLA). */
export type AutomationThreadContext = {
  status?: string;
  assignedToUserId?: string | null;
  lastMessageAt?: Date;
  lastCustomerMessageAt?: Date | null;
  tags?: { id: string; name: string }[];
  conversationState?: string;
  slaLevel?: string | null;
  isUnassigned?: boolean;
  responseDelayMs?: number | null;
  lastUnansweredInboundAt?: string | null;
  lastInboundMessageAt?: string | null;
};

export type AutomationEvent = {
  triggerType: AutomationTriggerType;
  tenantId: string;
  threadId: string;
  messageId?: string;
  messageText?: string;
  direction?: "INBOUND" | "OUTBOUND";
  status?: string;
  tagId?: string;
  tagName?: string;
  assignedToUserId?: string | null;
  thread?: AutomationThreadContext;
};

export type AutomationContext = {
  tenantId: string;
  threadId: string;
  executionId: string;
  depth: number;
  ruleIdsExecuted: Set<string>;
  messageText?: string;
  messageId?: string;
  direction?: string;
  status?: string;
  tagId?: string;
  assignedToUserId?: string | null;
  thread?: AutomationThreadContext;
};

export type PlaybookStep = {
  type: "action" | "delay";
  action?: Action;
  delayMs?: number;
};

export type PlaybookRow = {
  id: string;
  tenantId: string;
  name: string;
  isActive: boolean;
  steps: PlaybookStep[];
};
