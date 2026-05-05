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

  it("mostra mensagem personalizada e link Contrato e uso", async () => {
    vi.stubEnv("NEXT_PUBLIC_PRODUCT_MODE", "SAAS");
    const { FeatureUpgradePrompt } = await import("../FeatureUpgradePrompt");
    render(
      <SupportProvider>
        <FeatureUpgradePrompt
          blocked={{
            feature: "QUEUES_TAGS",
            currentPlan: "STARTER",
            requiredPlan: "PRO",
            message: "Filas completas fazem parte da operação contratada — fale com o suporte para incluir.",
          }}
        />
      </SupportProvider>
    );
    expect(screen.getByTestId("feature-upgrade-prompt")).toBeInTheDocument();
    expect(
      screen.getByText(/Filas completas fazem parte da operação contratada — fale com o suporte para incluir/i)
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /contrato e uso/i })).toHaveAttribute("href", "/dashboard/billing");
  });
});
