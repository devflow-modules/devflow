import { z } from "zod";

export const requestCodeBodySchema = z.object({
  phoneNumberId: z.string().min(1).optional(),
  codeMethod: z.enum(["SMS", "VOICE", "IVR"]),
  language: z
    .string()
    .min(2)
    .describe("Locale ex.: pt_BR, en_US (supported languages Meta)"),
});

export const verifyCodeBodySchema = z.object({
  phoneNumberId: z.string().min(1).optional(),
  code: z.string().min(4).max(32),
});

export const registerBodySchema = z.object({
  phoneNumberId: z.string().min(1).optional(),
  /** PIN de verificação em duas etapas (6 dígitos) — não é o SMS; define após registro. */
  pin: z.string().regex(/^\d{6}$/, "PIN deve ter exatamente 6 dígitos"),
});

export const statusQuerySchema = z.object({
  phoneNumberId: z.string().min(1).optional(),
});

const phoneDataSchema = z
  .object({
    id: z.string().optional(),
    display_phone_number: z.string().optional(),
    verified_name: z.string().optional(),
    code_verification_status: z.string().optional(),
    quality_rating: z.string().optional(),
    platform_type: z.string().optional(),
    is_official_business_account: z.boolean().optional(),
    throughput: z.object({ level: z.string().optional() }).optional(),
  })
  .passthrough();

export const phoneNumbersResponseSchema = z.object({
  data: z.array(phoneDataSchema).optional(),
});

export const successBoolSchema = z.object({
  success: z.boolean().optional(),
});
