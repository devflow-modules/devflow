/** @vitest-environment jsdom */
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SupportProvider } from "@/components/support/SupportProvider";

describe("FeatureUpgradePrompt", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("mostra mensagem e link Ver planos", async () => {
    vi.stubEnv("NEXT_PUBLIC_PRODUCT_MODE", "SAAS");
    const { FeatureUpgradePrompt } = await import("../FeatureUpgradePrompt");
    render(
      <SupportProvider>
        <FeatureUpgradePrompt
          blocked={{
            feature: "QUEUES_TAGS",
            currentPlan: "STARTER",
            requiredPlan: "PRO",
            message: "Upgrade para Pro para filas.",
          }}
        />
      </SupportProvider>
    );
    expect(screen.getByTestId("feature-upgrade-prompt")).toBeInTheDocument();
    expect(screen.getByText(/Upgrade para Pro para filas/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /ver planos/i })).toHaveAttribute("href", "/dashboard/billing");
  });
});
