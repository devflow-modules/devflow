import { describe, it, expect } from "vitest";
import { protectedApiUserMessage, PROTECTED_API_FORBIDDEN, PROTECTED_API_SESSION_EXPIRED } from "../protected-fetch";

describe("protectedApiUserMessage", () => {
  it("401 devolve mensagem de sessão (não silenciosa)", () => {
    expect(protectedApiUserMessage(401, {})).toBe(PROTECTED_API_SESSION_EXPIRED);
    expect(protectedApiUserMessage(401, { error: "Não autorizado" })).toBe(PROTECTED_API_SESSION_EXPIRED);
  });

  it("403 usa corpo quando existe e fallback quando vazio", () => {
    expect(protectedApiUserMessage(403, { error: "Acesso negado" })).toBe("Acesso negado");
    expect(protectedApiUserMessage(403, {})).toBe(PROTECTED_API_FORBIDDEN);
  });

  it("outros status usam error/message ou genérico", () => {
    expect(protectedApiUserMessage(500, { error: "Falha" })).toBe("Falha");
    expect(protectedApiUserMessage(502, {})).toBe("Não foi possível concluir o pedido. Tente novamente.");
  });
});
