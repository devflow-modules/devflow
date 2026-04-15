import { z } from "zod";

export const COMMISSION_TYPE_IMPLANTACAO = "implantacao" as const;

export const createAffiliateBodySchema = z.object({
  name: z.string().min(1).max(200),
  email: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.string().email().optional()
  ),
  phone: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.string().max(40).optional()
  ),
  commissionRate: z.number().min(0).max(1).optional().default(0.5),
});

export const patchTenantAffiliateBodySchema = z.object({
  affiliateId: z.union([z.string().cuid(), z.null()]),
});

export const patchGtmLifecycleBodySchema = z.object({
  gtmLifecycle: z.enum(["AVALIACAO", "IMPLANTADO"]),
});

export const patchCommissionPayBodySchema = z.object({
  status: z.literal("pago"),
});

/** Atualização operacional do tenant (admin). */
export const patchAdminTenantBodySchema = z.object({
  implantationPriceBrl: z.union([z.number().positive().max(50_000_000), z.null()]),
});
