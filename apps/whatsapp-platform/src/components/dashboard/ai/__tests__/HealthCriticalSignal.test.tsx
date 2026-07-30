/** @vitest-environment jsdom */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { HealthCriticalSignal } from "../HealthCriticalSignal";

describe("HealthCriticalSignal (dashboard-ai F1)", () => {
  it("mostra mensagem de summary", () => {
    render(
      <HealthCriticalSignal
        summary={{ overall: "ok", message: "Canal OK" }}
        error={null}
      />
    );
    expect(screen.getByTestId("health-critical-signal")).toHaveTextContent("Canal OK");
  });

  it("mostra erro de carga sem painel completo", () => {
    render(<HealthCriticalSignal summary={null} error="falhou" />);
    expect(screen.getByTestId("health-critical-signal")).toHaveTextContent(/não foi possível/i);
  });

  it("loading sem summary: placeholder", () => {
    render(<HealthCriticalSignal summary={null} error={null} loading />);
    expect(screen.getByTestId("health-critical-signal")).toBeInTheDocument();
  });
});
