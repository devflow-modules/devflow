/** @vitest-environment jsdom */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PendingAlertBanner } from "../PendingAlertBanner";

describe("PendingAlertBanner", () => {
  it("não renderiza quando pending ≤ threshold", () => {
    const { container } = render(<PendingAlertBanner pendingCount={10} />);
    expect(container.firstChild).toBeNull();
  });

  it("renderiza alerta quando pending > 10", () => {
    render(<PendingAlertBanner pendingCount={11} />);
    expect(screen.getByTestId("pending-accumulation-alert")).toBeInTheDocument();
    expect(screen.getByText(/Muitos canais pendentes/)).toBeInTheDocument();
  });
});
