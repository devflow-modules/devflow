import { describe, expect, it } from "vitest";
import { friendlyRoleLabel, roleScopeLine, teamRoleSegment } from "../role-presentation";

describe("role-presentation", () => {
  it("friendlyRoleLabel mapeia roles conhecidas", () => {
    expect(friendlyRoleLabel("operator")).toBe("Operador");
    expect(friendlyRoleLabel("manager")).toBe("Admin");
    expect(friendlyRoleLabel("platform_admin")).toBe("Admin da plataforma");
    expect(friendlyRoleLabel("unknown")).toBe("Membro da equipa");
  });

  it("teamRoleSegment separa gestão e operação", () => {
    expect(teamRoleSegment("operator")).toBe("operacao");
    expect(teamRoleSegment("manager")).toBe("gestao");
    expect(teamRoleSegment("platform_admin")).toBe("gestao");
  });

  it("roleScopeLine descreve função", () => {
    expect(roleScopeLine("operator")).toContain("inbox");
    expect(roleScopeLine("manager")).toContain("tenant");
    expect(roleScopeLine("platform_admin")).toContain("plataforma");
  });
});
