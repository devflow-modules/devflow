/** @vitest-environment jsdom */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FeatureUpgradePrompt } from "../FeatureUpgradePrompt";

describe("FeatureUpgradePrompt", () => {
  it("mostra mensagem e link Ver planos", () => {
    render(
      <FeatureUpgradePrompt
        blocked={{
          feature: "QUEUES_TAGS",
          currentPlan: "STARTER",
          requiredPlan: "PRO",
          message: "Upgrade para Pro para filas.",
        }}
      />
    );
    expect(screen.getByTestId("feature-upgrade-prompt")).toBeInTheDocument();
    expect(screen.getByText(/Upgrade para Pro para filas/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /ver planos/i })).toHaveAttribute("href", "/dashboard/billing");
  });
});
