/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import HomePage from "./page";

afterEach(() => {
  cleanup();
});

describe("ApplyFlow public Home", () => {
  it("keeps primary CTA contract and secondary anchor to #como-funciona", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Organize sua busca de emprego, da vaga à candidatura",
      }),
    ).toBeTruthy();

    const primary = screen.getByTestId("home-primary-cta");
    expect(primary.getAttribute("href")).toBe("/dashboard");
    expect(primary.textContent).toContain("Começar");

    const how = screen.getAllByRole("link", { name: "Como funciona", exact: true }).find(
      (link) => link.getAttribute("href") === "#como-funciona",
    );
    expect(how).toBeTruthy();
  });

  it("explains four in-app steps and the open vs send vs register distinction", () => {
    render(<HomePage />);

    const section = document.getElementById("como-funciona");
    expect(section).toBeTruthy();
    const scoped = within(section as HTMLElement);

    for (const title of ["Descobrir", "Avaliar", "Preparar e enviar", "Acompanhar"]) {
      expect(scoped.getByText(new RegExp(title))).toBeTruthy();
    }

    const text = section!.textContent ?? "";
    expect(text).toMatch(/Abrir o anúncio/i);
    expect(text).toMatch(/Enviar no portal da empresa/i);
    expect(text).toMatch(/Registrar o envio no ApplyFlow/i);
    expect(text).not.toMatch(/auto-apply|candidatura automática/i);
  });

  it("shows a fictional product preview with next action", () => {
    render(<HomePage />);
    expect(screen.getAllByText("Senior Product Engineer").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Próxima ação").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Abrir preparação").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Prévia ilustrativa/i).length).toBeGreaterThan(0);
  });
});
