/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FinanceiroHealthScorePanel } from "../FinanceiroHealthScorePanel";
import { getFinanceiroHealthScore } from "@/modules/financeiro/health/getFinanceiroHealthScore";

const mockedTrack = vi.hoisted(() => vi.fn());
vi.mock("@vercel/analytics", () => ({ track: mockedTrack }));

vi.mock("@/modules/financeiro/lib/useIsNarrowScreen", () => ({
  useIsNarrowScreen: () => true,
}));

vi.mock("next/link", () => ({
  default({ href, children, onClick, ...rest }: { href: string; children: React.ReactNode; onClick?: () => void }) {
    return (
      <a href={href} onClick={onClick} {...rest}>
        {children}
      </a>
    );
  },
}));

describe("FinanceiroHealthScorePanel — mobile (viewport estreito)", () => {
  beforeEach(() => mockedTrack.mockClear());

  it("abrir breakdown dispara financeiro_mobile_expand_score_breakdown", async () => {
    const result = getFinanceiroHealthScore({
      now: new Date("2026-03-01T12:00:00"),
      incomes: [],
      expenses: [],
      rulesCount: 0,
      activeMembershipRole: "OWNER",
    });

    render(
      <FinanceiroHealthScorePanel result={result} isLoading={false} isOwner householdId="h1" />
    );
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /ver critérios do score/i }));
    expect(mockedTrack).toHaveBeenCalledWith("financeiro_mobile_expand_score_breakdown", {});
  });
});
