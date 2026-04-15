/** @vitest-environment jsdom */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BillingAlerts } from "../BillingAlerts";

describe("BillingAlerts", () => {
  it("FREE em 100% com enforcement mostra limite da avaliação", () => {
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

  it("FREE entre 90 e 99% inclui contagem quando há limites", () => {
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
