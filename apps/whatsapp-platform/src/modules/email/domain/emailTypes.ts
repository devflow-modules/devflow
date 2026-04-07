import { z } from "zod";

export const TRANSACTIONAL_EMAIL_TYPES = [
  "RESET_PASSWORD",
  "PASSWORD_CHANGED",
  "ACCOUNT_CREATED",
  "WELCOME",
] as const;

export type TransactionalEmailType = (typeof TRANSACTIONAL_EMAIL_TYPES)[number];

export function isTransactionalEmailType(v: string): v is TransactionalEmailType {
  return (TRANSACTIONAL_EMAIL_TYPES as readonly string[]).includes(v);
}

export const resetPasswordPayloadSchema = z.object({
  userName: z.string().optional(),
  resetUrl: z.string().url(),
});

export const passwordChangedPayloadSchema = z.object({
  userName: z.string().optional(),
  supportEmail: z.string().email().optional(),
});

export const accountCreatedPayloadSchema = z.object({
  userName: z.string().optional(),
  loginUrl: z.string().url(),
  email: z.string().email(),
  /** @deprecated Preferir fluxo com setPasswordUrl (link seguro) em vez de senha em claro. */
  temporaryPassword: z.string().min(1).optional(),
  setPasswordUrl: z.string().url().optional(),
});

export const welcomePayloadSchema = z.object({
  userName: z.string().optional(),
  loginUrl: z.string().url(),
});

export type ResetPasswordPayload = z.infer<typeof resetPasswordPayloadSchema>;
export type PasswordChangedPayload = z.infer<typeof passwordChangedPayloadSchema>;
export type AccountCreatedPayload = z.infer<typeof accountCreatedPayloadSchema>;
export type WelcomePayload = z.infer<typeof welcomePayloadSchema>;

export type TransactionalEmailPayload =
  | { type: "RESET_PASSWORD"; payload: ResetPasswordPayload }
  | { type: "PASSWORD_CHANGED"; payload: PasswordChangedPayload }
  | { type: "ACCOUNT_CREATED"; payload: AccountCreatedPayload }
  | { type: "WELCOME"; payload: WelcomePayload };
