import { z } from "zod";

export const SUPPORT_CATEGORIES = [
  "whatsapp_connection",
  "messages_not_arriving",
  "platform_error",
  "question",
  "other",
] as const;

export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number];

export const supportCategorySchema = z.enum(SUPPORT_CATEGORIES);

export const supportReportRequestSchema = z.object({
  category: supportCategorySchema,
  description: z.string().min(1, "Descreva o problema").max(8000),
  pathname: z.string().max(2048).optional(),
  userAgent: z.string().max(2000).optional(),
  environment: z.enum(["production", "development", "preview", "test"]).optional(),
});

export type SupportReportRequest = z.infer<typeof supportReportRequestSchema>;

export type SupportDiagnostics = {
  activationComplete: boolean;
  phoneConnected: boolean;
  promptReady: boolean;
  apiKeyReady: boolean;
  phoneNumberId: string | null;
  displayPhoneNumber: string | null;
  lineStatus: string | null;
  threadCount: number;
  /** Mensagens dos últimos 7 dias (tenant). */
  recentMessagesCount: number;
};

export const SUPPORT_CATEGORY_LABELS: Record<SupportCategory, string> = {
  whatsapp_connection: "Conexão WhatsApp",
  messages_not_arriving: "Mensagens não chegam",
  platform_error: "Erro na plataforma",
  question: "Dúvida",
  other: "Outro",
};

export type SupportPayload = {
  debugId: string;
  userId: string;
  email: string;
  tenantId: string;
  role: string;
  category: SupportCategory;
  description: string;
  pathname: string;
  capturedAtIso: string;
  userAgent: string;
  environment: string;
  diagnostics: SupportDiagnostics;
};
