/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FinanceiroAuthedEntryHero } from "@/modules/financeiro/navigation/FinanceiroAuthedEntryHero";

const mockedTrack = vi.hoisted(() => vi.fn());
vi.mock("@vercel/analytics", () => ({ track: mockedTrack }));

vi.mock("next/link", () => ({
  default({ href, children, onClick, ...rest }: { href: string; children: React.ReactNode; onClick?: () => void }) {
    return (
      <a href={href} onClick={onClick} {...rest}>
        {children}
      </a>
    );
  },
}));

describe("FinanceiroAuthedEntryHero", () => {
  beforeEach(() => mockedTrack.mockClear());

  it("dispara return_detected ao montar e navegação ao clicar", async () => {
    render(
      <FinanceiroAuthedEntryHero
        resumeHref="/ferramentas/financeiro/sources"
        hasLastRoute
        sourcePath="/ferramentas/financeiro"
      />
    );
    const user = userEvent.setup();

    expect(mockedTrack).toHaveBeenCalledWith(
      "financeiro_return_detected",
      expect.objectContaining({
        source_path: "/ferramentas/financeiro",
        target_path: "/ferramentas/financeiro/sources",
        has_last_route: true,
      })
    );

    await user.click(screen.getByRole("link", { name: /meu painel/i }));
    expect(mockedTrack).toHaveBeenCalledWith(
      "financeiro_go_to_dashboard_clicked",
      expect.objectContaining({ surface: "financeiro_landing_authed" })
    );

    await user.click(screen.getByRole("link", { name: /continuar de onde parei/i }));
    expect(mockedTrack).toHaveBeenCalledWith(
      "financeiro_resume_last_route",
      expect.objectContaining({ interaction: "cta_click" })
    );
  });
});
