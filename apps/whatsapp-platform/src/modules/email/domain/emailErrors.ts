export const EMAIL_ERROR_CODES = [
  "EMAIL_NOT_CONFIGURED",
  "INVALID_EMAIL_TYPE",
  "INVALID_PAYLOAD",
  "SEND_FAILED",
] as const;

export type EmailErrorCode = (typeof EMAIL_ERROR_CODES)[number];

export class TransactionalEmailValidationError extends Error {
  readonly code: EmailErrorCode;

  constructor(code: EmailErrorCode, message: string) {
    super(message);
    this.name = "TransactionalEmailValidationError";
    this.code = code;
  }
}
