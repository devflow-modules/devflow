import { describe, it, expect } from "vitest";
import {
  classifyIntent,
  detectUrgency,
  suggestAction,
} from "../aiDecision.service";

describe("aiDecision.service", () => {
  describe("classifyIntent", () => {
    it("retorna intent baseado em keywords", async () => {
      const r = await classifyIntent("quero cancelar minha assinatura");
      expect(r.intent).toBeDefined();
      expect(["cancelamento", "reclamação", "outro"]).toContain(r.intent);
    });

    it("retorna out para mensagens neutras", async () => {
      const r = await classifyIntent("obrigado");
      expect(r.intent).toBeDefined();
    });
  });

  describe("detectUrgency", () => {
    it("retorna priority", async () => {
      const r = await detectUrgency("URGENTE preciso de ajuda");
      expect(r).toBeDefined();
      expect(["LOW", "MEDIUM", "HIGH"]).toContain(r);
    });
  });

  describe("suggestAction", () => {
    it("retorna action quando intent é cancelamento", async () => {
      const r = await suggestAction({
        messageText: "quero cancelar",
        intent: "cancelamento",
      });
      expect(r).not.toBeNull();
      expect(r!.action).toBeDefined();
    });
  });
});
