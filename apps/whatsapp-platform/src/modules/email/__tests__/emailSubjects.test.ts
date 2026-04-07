import { describe, expect, it } from "vitest";
import { getTransactionalEmailSubject } from "../domain/emailSubjects";

describe("getTransactionalEmailSubject", () => {
  it("retorna assunto por tipo", () => {
    expect(getTransactionalEmailSubject("RESET_PASSWORD")).toBe("Redefina sua senha");
    expect(getTransactionalEmailSubject("PASSWORD_CHANGED")).toBe("Sua senha foi alterada");
    expect(getTransactionalEmailSubject("ACCOUNT_CREATED")).toBe("Sua conta foi criada");
    expect(getTransactionalEmailSubject("WELCOME")).toBe("Bem-vindo à plataforma");
  });
});
