import { describe, it, expect } from "vitest";
import { parseMessage, getReplyForMessage, MESSAGES } from "../ruleBasedReplies";

describe("ruleBasedReplies", () => {
  describe("parseMessage", () => {
    it("retorna welcome para saudações", () => {
      expect(parseMessage("oi")).toBe("welcome");
      expect(parseMessage("Olá")).toBe("welcome");
      expect(parseMessage("bom dia")).toBe("welcome");
      expect(parseMessage("  OLA  ")).toBe("welcome");
    });

    it("retorna menu para menu/ajuda", () => {
      expect(parseMessage("menu")).toBe("menu");
      expect(parseMessage("opções")).toBe("menu");
      expect(parseMessage("ajuda")).toBe("menu");
      expect(parseMessage("0")).toBe("menu");
    });

    it("retorna option1 para como funciona", () => {
      expect(parseMessage("1")).toBe("option1");
      expect(parseMessage("como funciona")).toBe("option1");
    });

    it("retorna option2 para demo", () => {
      expect(parseMessage("2")).toBe("option2");
      expect(parseMessage("demo")).toBe("option2");
      expect(parseMessage("testar")).toBe("option2");
    });

    it("retorna option3 para especialista/humano", () => {
      expect(parseMessage("3")).toBe("option3");
      expect(parseMessage("especialista")).toBe("option3");
      expect(parseMessage("atendente")).toBe("option3");
    });

    it("retorna null para texto não mapeado", () => {
      expect(parseMessage("xyz")).toBeNull();
      expect(parseMessage("qualquer coisa")).toBeNull();
    });
  });

  describe("getReplyForMessage", () => {
    it("retorna mensagem correta para intent conhecido", () => {
      expect(getReplyForMessage("oi")).toBe(MESSAGES.welcome);
      expect(getReplyForMessage("menu")).toBe(MESSAGES.menu);
      expect(getReplyForMessage("1")).toBe(MESSAGES.option1);
    });

    it("retorna fallback para texto desconhecido", () => {
      expect(getReplyForMessage("asdf")).toBe(MESSAGES.fallback);
    });

    it("retorna demo quando WHATSAPP_DEMO_MODE=true e texto é 'demo'", () => {
      const prev = process.env.WHATSAPP_DEMO_MODE;
      process.env.WHATSAPP_DEMO_MODE = "true";
      expect(getReplyForMessage("demo")).toBe(MESSAGES.demo);
      process.env.WHATSAPP_DEMO_MODE = prev;
    });
  });
});
