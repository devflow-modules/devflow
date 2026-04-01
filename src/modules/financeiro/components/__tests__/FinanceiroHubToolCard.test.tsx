/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Wallet } from "lucide-react";
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
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: {
                user: { id: "u1" },
                financeiroResumePath: "/ferramentas/financeiro/rules",
                financeiroHasLastRoute: true,
              },
            }),
        })
      ) as unknown as typeof fetch
    );
  });

  it("ajusta CTA com retomada e dispara resume_last_route ao navegar", async () => {
    render(
      <FinanceiroHubToolCard
        icon={Wallet}
        title="Financeiro DevFlow"
        description="Controle pessoal e familiar."
        cta="Abrir"
        href="/ferramentas/financeiro"
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/continuar de onde parei/i)).toBeTruthy();
    });

    const user = userEvent.setup();
    const link = screen.getByRole("link", { name: /financeiro devflow/i });
    await user.click(link);
    expect(mockedTrack).toHaveBeenCalledWith(
      "financeiro_resume_last_route",
      expect.objectContaining({
        interaction: "cta_click",
        target_path: "/ferramentas/financeiro/rules",
      })
    );
  });
});
