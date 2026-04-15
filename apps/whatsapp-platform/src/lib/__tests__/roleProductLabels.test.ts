import { describe, expect, it } from "vitest";
import {
  inboxAssigneeCopy,
  productModeBadgeLabel,
  productRoleNameForSession,
} from "../roleProductLabels";

describe("roleProductLabels", () => {
  it("productModeBadgeLabel — modo por role", () => {
    expect(productModeBadgeLabel("operator")).toBe("Modo operador");
    expect(productModeBadgeLabel("manager")).toBe("Modo admin");
    expect(productModeBadgeLabel("platform_admin")).toBe("Modo plataforma");
    expect(productModeBadgeLabel(null)).toBe("");
  });

  it("productRoleNameForSession — nome curto do perfil", () => {
    expect(productRoleNameForSession("operator")).toBe("Operador");
    expect(productRoleNameForSession("manager")).toBe("Admin");
    expect(productRoleNameForSession("platform_admin")).toBe("Plataforma");
  });

  it("inboxAssigneeCopy — quando o responsável sou eu (manager)", () => {
    const r = inboxAssigneeCopy({
      assignedToUser: { id: "u1", name: "Ana" },
      isAssignedToMe: true,
      sessionRole: "manager",
      authUserId: "u1",
      threadStatus: "OPEN",
    });
    expect(r.line).toBe("Você (Admin)");
    expect(r.note).toBe("Admin assumiu esta conversa.");
  });

  it("inboxAssigneeCopy — quando o responsável sou eu (operator)", () => {
    const r = inboxAssigneeCopy({
      assignedToUser: { id: "u1", name: "Ana" },
      isAssignedToMe: true,
      sessionRole: "operator",
      authUserId: "u1",
      threadStatus: "OPEN",
    });
    expect(r.line).toBe("Você (Operador)");
    expect(r.note).toBe("Operador a tratar esta conversa.");
  });

  it("inboxAssigneeCopy — terceiro: só nome (sem role na API)", () => {
    const r = inboxAssigneeCopy({
      assignedToUser: { id: "u2", name: "Bruno" },
      isAssignedToMe: false,
      sessionRole: "operator",
      authUserId: "u1",
      threadStatus: "OPEN",
    });
    expect(r.line).toBe("Responsável: Bruno");
    expect(r.note).toBeUndefined();
  });

  it("inboxAssigneeCopy — conversa fechada sem responsável", () => {
    const r = inboxAssigneeCopy({
      assignedToUser: null,
      isAssignedToMe: false,
      sessionRole: "manager",
      authUserId: "u1",
      threadStatus: "CLOSED",
    });
    expect(r.line).toBe("—");
  });
});
