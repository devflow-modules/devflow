/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FinanceiroHubToolCard } from "@/modules/financeiro/navigation/FinanceiroHubToolCard";

const mockedTrack = vi.hoisted(() => vi.fn());
vi.mock("@vercel/analytics", () => ({ track: mockedTrack }));

vi.mock("next/link", () => ({
  default ({
    href,
    children,
    onClick,
    ...rest
  }: React.ComponentProps<"a"> & { href: string }) {
    return (
      <a href={href} onClick={onClick} {...rest}>
        {children}
      </a>
    );
  },
}));

describe("FinanceiroHubToolCard", () => {
  beforeEach(() => {
    mockedTrack.mockClear();
  });

  it("renderiza link da landing e dispara analytics ao navegar", async () => {
    render(
      <FinanceiroHubToolCard
        title="Financeiro DevFlow"
        description="Controle pessoal e familiar."
        cta="Testar grátis"
        href="/ferramentas/financeiro"
      />
    );

    const user = userEvent.setup();
    const link = screen.getByRole("link", { name: /financeiro devflow/i });
    expect(link).toHaveAttribute("href", "/ferramentas/financeiro");

    await user.click(link);
    expect(mockedTrack).toHaveBeenCalledWith(
      "financeiro_go_to_dashboard_clicked",
      expect.objectContaining({
        source_path: "/ferramentas",
        target_path: "/ferramentas/financeiro",
      })
    );
  });
});
