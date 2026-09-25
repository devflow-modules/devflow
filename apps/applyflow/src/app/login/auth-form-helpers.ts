export const AUTH_CONFIRM_EMAIL_MESSAGE = "Check your email to confirm your account.";

export type SignUpOutcome = "session" | "confirm_email";

/**
 * When email confirmation is required, Supabase returns a user without a session.
 */
export function resolveSignUpOutcome(sessionPresent: boolean): SignUpOutcome {
  return sessionPresent ? "session" : "confirm_email";
}

export function mapAuthFormError(message: string | undefined): string {
  if (!message || message.trim().length === 0) {
    return "Authentication failed. Try again.";
  }
  return message;
}
