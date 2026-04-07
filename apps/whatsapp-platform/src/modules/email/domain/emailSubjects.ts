import type { TransactionalEmailType } from "./emailTypes";

const SUBJECTS: Record<TransactionalEmailType, string> = {
  RESET_PASSWORD: "Redefina sua senha",
  PASSWORD_CHANGED: "Sua senha foi alterada",
  ACCOUNT_CREATED: "Sua conta foi criada",
  WELCOME: "Bem-vindo à plataforma",
};

export function getTransactionalEmailSubject(type: TransactionalEmailType): string {
  return SUBJECTS[type];
}
