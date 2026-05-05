export type WhatsappChannelStatus = "PENDING_ACTIVATION" | "ACTIVE" | "ERROR";

export type AdminWhatsappChannelRow = {
  id: string;
  tenantId: string;
  tenantName: string;
  phone: string;
  wabaId: string | null;
  phoneNumberId: string;
  status: WhatsappChannelStatus;
  hasToken: boolean;
  readyForOutbound: boolean;
  updatedAt: string;
  label: string | null;
  purpose: string;
  autoReplyEnabled: boolean | null;
  aiProfileOverride: string | null;
};

export type AdminTenantOption = {
  id: string;
  name: string | null;
};
