/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FinanceiroHealthScorePanel } from "@/modules/financeiro/components/health/FinanceiroHealthScorePanel";
import { FinanceiroInsightsPanel } from "@/modules/financeiro/components/insights/FinanceiroInsightsPanel";
import { MonthlyChecklistPanel } from "@/modules/financeiro/components/routine/MonthlyChecklistPanel";
import { getFinanceiroHealthScore } from "@/modules/financeiro/health/getFinanceiroHealthScore";
import type { FinanceiroInsight } from "@/modules/financeiro/insights/types";
import type { FinanceiroMonthlyTask } from "@/modules/financeiro/routine/types";

const mockedTrack = vi.hoisted(() => vi.fn());
vi.mock("@vercel/analytics", () => ({ track: mockedTrack }));

vi.mock("@/modules/financeiro/lib/useIsNarrowScreen", () => ({
  useIsNarrowScreen: () => false,
}));

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

const NOW = new Date("2026-02-10T12:00:00");

function scoreEmptyOwner() {
  return getFinanceiroHealthScore({
    now: NOW,
    incomes: [],
    expenses: [],
    rulesCount: 0,
    activeMembershipRole: "OWNER",
  });
}

const threeInsights: FinanceiroInsight[] = [
  {
    id: "i1",
    type: "warning",
    priority: 1,
    title: "Alerta A",
    description: "Descrição A",
    cta: { label: "Corrigir A", href: "/ferramentas/financeiro/expenses" },
  },
  {
    id: "i2",
    type: "opportunity",
    priority: 2,
    title: "Alerta B",
    description: "Descrição B",
    cta: { label: "Corrigir B", href: "/ferramentas/financeiro/rules" },
  },
  {
    id: "i3",
    type: "info",
    priority: 3,
    title: "Alerta C",
    description: "Descrição C",
    cta: { label: "Corrigir C", href: "/ferramentas/financeiro/dashboard" },
  },
];

const manyTasks: FinanceiroMonthlyTask[] = [
  { id: "t1", title: "Pendente 1", completed: false, priority: 1, cta: { label: "Ir", href: "/a" } },
  { id: "t2", title: "Pendente 2", completed: false, priority: 2, cta: { label: "Ir", href: "/b" } },
  { id: "t3", title: "Pendente 3", completed: false, priority: 3, cta: { label: "Ir", href: "/c" } },
  { id: "t4", title: "Ok", completed: true, priority: 4, cta: { label: "Ir", href: "/d" } },
];

describe("dashboard — painéis inteligentes (integração leve)", () => {
  beforeEach(() => mockedTrack.mockClear());

  it("score: CTA primário e expansão do breakdown", async () => {
    const result = scoreEmptyOwner();
    render(
      <FinanceiroHealthScorePanel
        result={result}
        isLoading={false}
        isOwner
        householdId="hh1"
      />
    );
    const user = userEvent.setup();

    expect(screen.getByText(/30%/)).toBeTruthy();
    expect(screen.getByRole("link", { name: /registrar receita/i })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /ver critérios do score/i }));
    expect(screen.getByText(/receitas no mês/i)).toBeTruthy();
  });

  it("insights: botão ver mais dispara analytics mobile expand", async () => {
    const user = userEvent.setup();
    render(<FinanceiroInsightsPanel insights={threeInsights} isLoading={false} />);

    const btn = screen.getByRole("button", { name: /ver mais alertas/i });
    await user.click(btn);
    expect(mockedTrack).toHaveBeenCalledWith(
      "financeiro_mobile_expand_insights",
      expect.objectContaining({ hidden_count: 2 })
    );
  });

  it("checklist: ver tudo expande e dispara analytics", async () => {
    render(<MonthlyChecklistPanel tasks={manyTasks} isLoading={false} />);
    const user = userEvent.setup();

    const btn = screen.getByRole("button", { name: /ver tudo/i });
    await user.click(btn);
    expect(mockedTrack).toHaveBeenCalledWith(
      "financeiro_mobile_expand_checklist",
      expect.objectContaining({ hidden_count: 2 })
    );
    expect(screen.getByText("Pendente 3")).toBeTruthy();
  });

  it("checklist: mês organizado mostra estado final", () => {
    const done: FinanceiroMonthlyTask[] = [
      { id: "t1", title: "A", completed: true, priority: 1, cta: { label: "x", href: "/" } },
    ];
    render(<MonthlyChecklistPanel tasks={done} isLoading={false} />);
    expect(screen.getByText(/seu mês está organizado/i)).toBeTruthy();
  });
});
