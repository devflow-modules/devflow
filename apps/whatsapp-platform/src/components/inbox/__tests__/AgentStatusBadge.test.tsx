import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AgentStatusBadge } from "../AgentStatusBadge";

describe("AgentStatusBadge", () => {
  it("usa badge de sucesso para disponível", () => {
    render(<AgentStatusBadge status="available" />);
    const badge = screen.getByTitle("Livre");
    expect(badge.className).toContain("df-badge-success");
    expect(badge.textContent).toContain("Livre");
  });

  it("usa badge de perigo para em atendimento", () => {
    render(<AgentStatusBadge status="busy" />);
    const badge = screen.getByTitle("Em atendimento");
    expect(badge.className).toContain("df-badge-danger");
  });

  it("usa badge muted para offline", () => {
    render(<AgentStatusBadge status={null} />);
    const badge = screen.getByTitle("Offline");
    expect(badge.className).toContain("df-badge-muted");
  });
});
