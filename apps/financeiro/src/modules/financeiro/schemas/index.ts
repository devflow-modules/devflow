import { z } from "zod";

export const financialContextSchema = z.enum(["PERSONAL", "BUSINESS", "SHARED"]);
export type FinancialContext = "PERSONAL" | "BUSINESS" | "SHARED";

export const CONTEXT_LABELS: Record<FinancialContext, string> = {
  PERSONAL: "Só sua",
  BUSINESS: "Empresa",
  SHARED: "Várias pessoas juntas",
};

export const authEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email({ message: "e-mail inválido" });

export const authPasswordSchema = z
  .string()
  .min(8, { message: "senha deve ter pelo menos 8 caracteres" })
  .max(72, { message: "senha muito longa" });

export const membershipRoleSchema = z.enum(["OWNER", "MEMBER"]);
export const sourceTypeSchema = z.enum(["PJ", "PF"]);
export const expenseStatusSchema = z.enum(["PENDING", "PAID", "SCHEDULED"]);
export const incomeStatusSchema = z.enum(["SCHEDULED", "RECEIVED"]);

const dateOnlyOrIsoSchema = z.string().refine((value) => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return true;
  if (value.includes("T") && !Number.isNaN(Date.parse(value))) return true;
  return false;
}, { message: "data inválida" });

export const householdCreateSchema = z.object({
  name: z.string().min(3, { message: "nome deve ter pelo menos 3 caracteres" }),
  slug: z
    .string()
    .min(3, { message: "slug deve ter pelo menos 3 caracteres" })
    .regex(/^[a-z0-9-]+$/, {
      message: "slug deve conter apenas letras minúsculas, números e hífen (ex.: casa-marques)",
    }),
  timezone: z.string().nonempty().default("America/Sao_Paulo"),
});

export const sourceCreateSchema = z.object({
  name: z.string().min(1),
  sourceType: sourceTypeSchema,
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const sourceUpdateSchema = sourceCreateSchema.partial();

export const paymentDaySchema = z.object({
  dayOfMonth: z.number().min(1).max(31),
  description: z.string().optional(),
  sourceId: z.string().cuid(),
  cycleId: z.string().cuid().optional(),
});

export const paymentDayUpdateSchema = paymentDaySchema.partial().extend({
  sourceId: z.string().cuid().optional(),
  cycleId: z.string().cuid().optional().nullable(),
});

export const cycleTypeSchema = z.enum(["MONTHLY", "WEEKLY"]);

const cycleBaseSchema = z.object({
  name: z.string().min(2, { message: "Nome do ciclo deve ter pelo menos 2 caracteres" }),
  cycleType: cycleTypeSchema.default("MONTHLY"),
  anchorDay: z.number().int().min(1).max(31).optional(),
  anchorWeekDay: z.number().int().min(0).max(6).optional(),
});

export const cycleCreateSchema = cycleBaseSchema.superRefine((data, ctx) => {
  if (data.cycleType === "MONTHLY" && data.anchorDay == null) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Para ciclo mensal informe o dia âncora (1-31)", path: ["anchorDay"] });
  }
  if (data.cycleType === "WEEKLY" && data.anchorWeekDay == null) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Para ciclo semanal informe o dia da semana (0=domingo a 6=sábado)", path: ["anchorWeekDay"] });
  }
});

export const cycleUpdateSchema = cycleBaseSchema.partial();

export const categoryCreateSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#6366f1"),
});
export const categoryUpdateSchema = categoryCreateSchema.partial();

export const budgetCreateSchema = z.object({
  categoryId: z.string().cuid(),
  monthlyLimit: z.number().positive("Limite mensal deve ser positivo"),
});
export const budgetUpdateSchema = z.object({
  monthlyLimit: z.number().positive().optional(),
});

const expenseBaseSchema = z.object({
  categoryId: z.string().cuid().optional(),
  category: z.string().min(1).optional(), // required when categoryId not set
  amount: z.number().positive(),
  dueDate: dateOnlyOrIsoSchema,
  status: expenseStatusSchema.optional(),
  sourceId: z.string().cuid().optional(),
  isRecurring: z.boolean().default(false).optional(),
  paidAmount: z.number().positive().optional(),
  paidAt: dateOnlyOrIsoSchema.optional(),
  note: z.string().max(500).optional(),
  context: financialContextSchema.optional().default("PERSONAL"),
  accountId: z.string().cuid().optional(),
  expenseSplitType: z.enum(["SHARED", "INDIVIDUAL"]).optional().default("SHARED"),
  paidByParticipantId: z.string().cuid().optional(),
});

export const expenseCreateSchema = expenseBaseSchema.superRefine((data, ctx) => {
  if (!data.categoryId && !(data.category && data.category.trim())) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Informe category ou categoryId", path: ["category"] });
  }
  if (data.status === "PAID") {
    if (data.paidAmount === undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "paidAmount é obrigatório quando status=PAID", path: ["paidAmount"] });
    }
    if (data.paidAt === undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "paidAt é obrigatório quando status=PAID", path: ["paidAt"] });
    }
  }
  if (data.expenseSplitType === "INDIVIDUAL" && data.accountId && !data.paidByParticipantId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "paidByParticipantId é obrigatório quando tipo é INDIVIDUAL", path: ["paidByParticipantId"] });
  }
});

export const accountCreateSchema = z.object({
  name: z.string().min(1, "Nome da conta é obrigatório"),
  type: financialContextSchema.default("PERSONAL"),
});
export const accountParticipantSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  defaultShare: z.number().min(0).max(1),
  userId: z.string().cuid().optional(),
});

export const idempotencyKeySchema = z.string().min(8).max(200).optional();

export const manualSettlementSchema = z.object({
  fromParticipantId: z.string().cuid(),
  toParticipantId: z.string().cuid(),
  amount: z.number().positive("Valor deve ser positivo"),
  idempotencyKey: idempotencyKeySchema,
});

export const settlementPaymentSchema = z.object({
  amount: z.number().positive("Valor pago deve ser positivo"),
  idempotencyKey: idempotencyKeySchema,
});

export const settlementsGenerateSchema = z.object({
  idempotencyKey: idempotencyKeySchema,
});

export const paymentReverseSchema = z.object({
  amount: z.number().positive().optional(),
  idempotencyKey: idempotencyKeySchema,
});

export const closeAccountMonthSchema = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Use YYYY-MM"),
  idempotencyKey: idempotencyKeySchema,
});

export const expenseUpdateSchema = expenseBaseSchema.partial().superRefine((data, ctx) => {
  if (data.status === "PAID") {
    if (data.paidAmount === undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "paidAmount é obrigatório quando status=PAID", path: ["paidAmount"] });
    }
    if (data.paidAt === undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "paidAt é obrigatório quando status=PAID", path: ["paidAt"] });
    }
  }
});

export const incomeCreateSchema = z.object({
  sourceId: z.string().cuid().optional(),
  amount: z.number().positive(),
  receivedAt: dateOnlyOrIsoSchema,
  isRecurring: z.boolean().default(false).optional(),
  status: incomeStatusSchema.optional().default("RECEIVED"),
  notes: z.string().max(500).optional(),
  context: financialContextSchema.optional().default("PERSONAL"),
});

export const incomeUpdateSchema = incomeCreateSchema.partial();

export const ruleCreateSchema = z.object({
  name: z.string().min(3),
  description: z.string().optional(),
  ruleType: z.enum(["CATEGORY_PERCENTAGE", "FIXED_PER_MEMBER"]),
  percentage: z.number().min(0).max(100).optional(),
  fixedAmount: z.number().positive().optional(),
  referenceCategory: z.string().optional(),
  sourceIds: z.array(z.string().cuid()).min(1),
});

export const ruleUpdateSchema = ruleCreateSchema.partial();

export const inviteCreateSchema = z.object({
  email: z.string().email(),
  role: membershipRoleSchema.optional().default("MEMBER"),
});

export const inviteAcceptSchema = z.object({
  token: z.string().min(10),
});

export const activeHouseholdSetSchema = z.object({
  householdId: z.string().min(10),
});

export const householdMemberRemoveSchema = z.object({
  membershipId: z.string().min(10),
});

export const householdTransferOwnershipSchema = z.object({
  newOwnerMembershipId: z.string().cuid(),
});

export const cashFlowProjectionQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  horizonDays: z.coerce.number().int().min(1).max(365).optional(),
  horizonMonths: z.coerce.number().int().min(1).max(12).optional(),
  avgMonths: z.coerce.number().int().min(1).max(12).optional().default(3),
  scenario: z.enum(["BASE", "PESSIMISTIC", "OPTIMISTIC"]).optional().default("BASE"),
});

export const financeiroLeadCreateSchema = z.object({
  email: z.string().email("e-mail inválido"),
  source: z.string().min(1).max(100),
  sessionId: z.string().min(1).max(200).optional(),
});

export const marketingLeadCreateSchema = z.object({
  email: z.string().email(),
  whatsapp: z.string().min(8).max(30).optional(),
  goal: z
    .enum(["CONTROLAR_GASTOS", "ORGANIZAR_PJ_PF", "PAGAR_DIVIDAS", "GUARDAR_INVESTIR"])
    .optional(),
  consentEmail: z.boolean(),
  consentWhatsapp: z.boolean().optional().default(false),
  consentTextVersion: z.string().min(1),
  utmSource: z.string().max(120).optional(),
  utmMedium: z.string().max(120).optional(),
  utmCampaign: z.string().max(200).optional(),
  landingPath: z.string().max(200).optional(),
  referrer: z.string().max(200).optional(),
});

export const marketingDispatchQuerySchema = z.object({
  channel: z.enum(["EMAIL", "WHATSAPP"]).optional().default("EMAIL"),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export const marketingWhatsappMarkSchema = z.object({
  scheduleIds: z.array(z.string().min(10)).min(1),
});

export const marketingNewsletterCreateSchema = z.object({
  templateKey: z.string().min(3).optional().default("newsletter_weekly"),
  scheduledFor: z.string().optional(),
});

const incomeAllocationGoalBaseSchema = z.object({
  year: z.number().int().min(2000).max(3000),
  month: z.number().int().min(1).max(12),
  investmentPercent: z.number().min(0).max(100).optional(),
  savingsPercent: z.number().min(0).max(100).optional(),
  investmentAmount: z.number().min(0).optional(),
  savingsAmount: z.number().min(0).optional(),
  observations: z.string().max(2000).optional(),
});

export const incomeAllocationGoalCreateSchema = incomeAllocationGoalBaseSchema.refine((data) => {
  const hasAny =
    data.investmentPercent !== undefined ||
    data.savingsPercent !== undefined ||
    data.investmentAmount !== undefined ||
    data.savingsAmount !== undefined ||
    (data.observations?.trim()?.length ?? 0) > 0;
  return hasAny;
}, { message: "Informe ao menos um campo (percentual/valor/observações)." });

export const incomeAllocationGoalUpdateSchema = incomeAllocationGoalBaseSchema.partial();

export const personalAllocationGoalCreateSchema = incomeAllocationGoalBaseSchema.refine((data) => {
  const hasAny =
    data.investmentPercent !== undefined ||
    data.savingsPercent !== undefined ||
    data.investmentAmount !== undefined ||
    data.savingsAmount !== undefined ||
    (data.observations?.trim()?.length ?? 0) > 0;
  return hasAny;
}, { message: "Informe ao menos um campo (percentual/valor/observações)." });

export const personalAllocationGoalUpdateSchema = incomeAllocationGoalBaseSchema.partial();
