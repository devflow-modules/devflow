/**
 * Tipos para o engine de automação.
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
  | "timeSinceLastMessage_gt";

export type Condition = {
  field: string;
  operator: ConditionOperator;
  value?: string | number | boolean | null;
};

export type ActionType =
  | "assignConversation"
  | "updateStatus"
  | "addTag"
  | "removeTag"
  | "setPriority"
  | "sendMessage"
  | "triggerAIResponse"
  | "logAction";

export type Action = {
  type: ActionType;
  params?: Record<string, unknown>;
};

export type AutomationRuleRow = {
  id: string;
  tenantId: string;
  name: string;
  isActive: boolean;
  triggerType: string;
  conditions: Condition[];
  actions: Action[];
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
  thread?: {
    status?: string;
    assignedToUserId?: string | null;
    lastMessageAt?: Date;
    lastCustomerMessageAt?: Date | null;
    tags?: { id: string; name: string }[];
  };
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
  thread?: {
    status?: string;
    assignedToUserId?: string | null;
    lastMessageAt?: Date;
    lastCustomerMessageAt?: Date | null;
    tags?: { id: string; name: string }[];
  };
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
