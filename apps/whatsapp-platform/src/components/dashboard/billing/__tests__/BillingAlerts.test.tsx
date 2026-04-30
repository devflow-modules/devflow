/** @vitest-environment jsdom */
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

describe("BillingAlerts", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("FREE em 100% com enforcement mostra limite da avaliação", async () => {
    vi.stubEnv("NEXT_PUBLIC_PRODUCT_MODE", "SAAS");
    const { BillingAlerts } = await import("../BillingAlerts");
    render(
      <BillingAlerts
        currentPlan="FREE"
        usagePercentageMessages={100}
        usagePercentageAI={40}
        enforceLimits
        overageMessages={0}
        overageAI={0}
      />
    );
    expect(screen.getByRole("alert")).toHaveTextContent(/limite da avaliação/i);
  });

  it("FREE entre 90 e 99% inclui contagem quando há limites", async () => {
    vi.stubEnv("NEXT_PUBLIC_PRODUCT_MODE", "SAAS");
    const { BillingAlerts } = await import("../BillingAlerts");
    render(
      <BillingAlerts
        currentPlan="FREE"
        usagePercentageMessages={92}
        usagePercentageAI={20}
        enforceLimits
        overageMessages={0}
        overageAI={0}
        messagesUsed={46}
        messagesLimit={50}
        aiUsed={2}
        aiLimit={10}
      />
    );
    expect(screen.getByRole("alert")).toHaveTextContent(/46/);
    expect(screen.getByRole("alert")).toHaveTextContent(/50/);
  });
});
