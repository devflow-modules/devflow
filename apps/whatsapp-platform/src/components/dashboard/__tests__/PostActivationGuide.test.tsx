/** @vitest-environment jsdom */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PostActivationGuide } from "../PostActivationGuide";

describe("PostActivationGuide", () => {
  it("gera link wa.me com texto pré-preenchido quando há display E.164", () => {
    render(
      <PostActivationGuide
        displayNumber="+55 11 98888-7777"
        phoneNumberId="meta-id-1"
        lineStatus="ACTIVE"
      />
    );
    const a = screen.getByRole("link", { name: /abrir whatsapp/i });
    expect(a).toHaveAttribute("target", "_blank");
    expect(a).toHaveAttribute("rel", "noopener noreferrer");
    expect(a.getAttribute("href")).toContain("https://wa.me/5511988887777");
    expect(a.getAttribute("href")).toContain("text=");
  });

  it("mostra status da linha", () => {
    render(
      <PostActivationGuide displayNumber={null} phoneNumberId={null} lineStatus="PENDING" />
    );
    expect(screen.getByTestId("line-status-dashboard")).toHaveTextContent(/não conectado/);
  });
});
