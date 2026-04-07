import { render } from "@react-email/render";
import * as React from "react";
import type {
  AccountCreatedPayload,
  PasswordChangedPayload,
  ResetPasswordPayload,
  TransactionalEmailType,
  WelcomePayload,
} from "../domain/emailTypes";
import { AccountCreatedEmail } from "../templates/AccountCreatedEmail";
import { PasswordChangedEmail } from "../templates/PasswordChangedEmail";
import { ResetPasswordEmail } from "../templates/ResetPasswordEmail";
import { WelcomeEmail } from "../templates/WelcomeEmail";

export async function renderTransactionalEmailHtml(
  type: TransactionalEmailType,
  payload:
    | ResetPasswordPayload
    | PasswordChangedPayload
    | AccountCreatedPayload
    | WelcomePayload
): Promise<string> {
  switch (type) {
    case "RESET_PASSWORD":
      return render(
        React.createElement(ResetPasswordEmail, payload as ResetPasswordPayload)
      );
    case "PASSWORD_CHANGED":
      return render(
        React.createElement(PasswordChangedEmail, payload as PasswordChangedPayload)
      );
    case "ACCOUNT_CREATED":
      return render(
        React.createElement(AccountCreatedEmail, payload as AccountCreatedPayload)
      );
    case "WELCOME":
      return render(React.createElement(WelcomeEmail, payload as WelcomePayload));
    default: {
      const _exhaustive: never = type;
      throw new Error(`Tipo de template não suportado: ${String(_exhaustive)}`);
    }
  }
}
