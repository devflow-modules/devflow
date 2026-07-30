import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AiStatusSummary } from "../AiStatusSummary";

describe("AiStatusSummary (settings-ai F2)", () => {
  it("mostra IA e auto-resposta sem badge Modo derivado", () => {
    render(<AiStatusSummary enabled autoReply motorLabel="OpenAI" />);
    expect(screen.getByText("IA ativa")).toBeInTheDocument();
    expect(screen.getByText("Auto-resposta ligada")).toBeInTheDocument();
    expect(screen.queryByText(/Modo automático/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Modo assistido/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Modo inativo/i)).not.toBeInTheDocument();
    expect(screen.getByText(/OpenAI/)).toBeInTheDocument();
  });

  it("quando desactivada: sem Modo inativo", () => {
    render(<AiStatusSummary enabled={false} autoReply={false} motorLabel="regras" />);
    expect(screen.getByText("IA desativada")).toBeInTheDocument();
    expect(screen.queryByText(/Modo/i)).not.toBeInTheDocument();
  });
});
